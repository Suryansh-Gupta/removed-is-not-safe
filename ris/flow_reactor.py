"""
flow_reactor.py  —  tanks-in-series and particle models of the coiled-tube contact chamber
=========================================================================================
Imported by flow_reactor.ipynb (D3) and later the optimizer.

Idea: water doesn't all spend exactly the same time in a tube. We copy that by pretending the
tube is N small, well-mixed tanks in a row. N = 1 is one stirred tank; very large N is a perfect
pipe ("plug flow", same as a beaker left for time tau). The real N comes from the November dye test.

  tau = tube volume / flow rate   (average time water spends in the chamber)
  each tank holds tau / N of that time
"""

import numpy as np
from scipy.integrate import solve_ivp
from scipy.optimize import curve_fit
from scipy.special import gammaln

_trapz = getattr(np, "trapezoid", None) or np.trapz   # works on old and new numpy
from . import chlorine_backbone as cb
from . import cipro_model as cm


# ------------------------------------------------------------------ residence-time distribution
def rtd_tanks(t, tau, N):
    """
    Textbook exit-age curve E(t) for N equal tanks in series (a gamma distribution).
    E(t) dt = fraction of a dye pulse that leaves between t and t+dt. Works for non-integer N.
    """
    t = np.maximum(np.asarray(t, float), 1e-12)
    return np.exp(N * np.log(N / tau) + (N - 1) * np.log(t) - N * t / tau - gammaln(N))


def simulate_pulse(tau, N, t):
    """Simulate a dye pulse going through N tanks (no reaction); return E(t) at outlet."""
    N = int(N)
    def f(_, C):
        Cin = np.concatenate(([0.0], C[:-1]))
        return (N / tau) * (Cin - C)
    C0 = np.zeros(N); C0[0] = N / tau        # whole pulse starts in tank 1, scaled so area = 1
    s = solve_ivp(f, [0, t[-1]], C0, t_eval=t, method="LSODA", rtol=1e-9, atol=1e-12)
    return s.y[-1]


def fit_tanks(t, signal):
    """
    Fit N and tau to a measured dye curve (any units; it's normalized to area 1).
    Returns (N, tau, fitted_curve). Use on the November tracer-test data.
    """
    t = np.asarray(t, float); s = np.asarray(signal, float)
    s = s - min(s[0], s.min())               # remove baseline
    E = s / _trapz(s, t)
    tau_guess = _trapz(t * E, t)
    (tau, N), _ = curve_fit(rtd_tanks, t, E, p0=[tau_guess, 3.0], bounds=([1e-6, 0.5], [np.inf, 500]))
    return N, tau, rtd_tanks(t, tau, N)


# ------------------------------------------------------------------ steady state through N tanks
def steady_tanks(rate_fn, y_in, tau, N, settle=25):
    """
    Steady-state outlet of N stirred tanks in series.
    rate_fn(y) -> dy/dt from reactions alone. Each tank:  dy/dt = (y_in - y)/(tau/N) + rate_fn(y).
    Solved tank by tank: run each one until it stops changing (settle x its own holding time).
    Returns list of steady states, one per tank (last one = outlet).
    """
    th = tau / N
    states, y_feed = [], np.asarray(y_in, float)
    for _ in range(int(N)):
        f = lambda t, y, yf=y_feed: (yf - y) / th + np.asarray(rate_fn(y))
        s = solve_ivp(f, [0, settle * th], y_feed, method="LSODA", rtol=1e-9, atol=1e-16)
        y_feed = s.y[:, -1]
        states.append(y_feed)
    return states


# ------------------------------------------------------------------ tube size + flow -> flow pattern (added 10-15)
NU_WATER = 0.95e-6     # m^2/s, kinematic viscosity of water at ~22 C
D_CIPRO = 7e-10        # m^2/s, cipro diffusion coefficient. ESTIMATE from molecular size (~331 g/mol); not measured
DEAN_LIMIT = 20        # the Dean 1927 swirl formula holds for gentle swirl only; above this we drop the swirl (widest spread)
PORTS = (0.25, 0.5, 0.75, 1.0)   # sampling ports A, B, C and the outlet, as fractions of tube length
# Standard PTFE sizes, inner -> outer diameter in mm. 1/8 in ID comes as 1/4 in OD (the chosen tube).
# Same table as the prototype simulator (docs/artifacts/reactor-prototype-simulator.html).
TUBE_OD_MM = {0.79: 1.59, 1.59: 3.175, 2.38: 3.97, 3.175: 6.35, 4.76: 6.35, 6.35: 9.53}
WALL_MM = 0.8          # ESTIMATE: wall thickness assumed for any tube not in the table


def tube_hydraulics(tube_id_mm, tube_length_m, flow_mL_min, coil_diameter_mm=None, Dm=D_CIPRO, tube_od_mm=None):
    """
    Predict how water moves through a straight or coiled tube BEFORE the dye test.
      u        mean speed, m/s           tau   mean residence time, s (tube volume / flow)
      Re       Reynolds number (laminar below ~2,100)
      theta    Dm * tau / R^2: how far a molecule diffuses across the tube during its stay.
               theta >~ 0.8 -> Taylor dispersion (diffusion evens out the speed differences, narrow spread)
               theta << 0.8 -> laminar convection (centre water moves 2x the average, wide spread)
      De       Dean number, for coiled tubes. Coiling stirs the flow sideways and narrows the spread.
               coil_diameter_mm is the FORMER the tube is wound on; the bend radius runs to the tube's
               centreline, so it is (former + tube outer diameter) / 2.
      S        strength of the Dean swirl in the units simulate_coil uses (0 for a straight tube)
      N_equiv  tanks-in-series number with the same spread (variance) as the STRAIGHT-tube estimate.
               run_tube's particle model replaces this with a spread that includes the swirl.
    """
    R = tube_id_mm / 2000
    area = np.pi * R ** 2
    Q = flow_mL_min * 1e-6 / 60
    u = Q / area
    tau = tube_length_m / u
    Re = u * 2 * R / NU_WATER
    theta = Dm * tau / R ** 2
    od_mm = tube_od_mm if tube_od_mm else TUBE_OD_MM.get(tube_id_mm, tube_id_mm + 2 * WALL_MM)
    Rc = (coil_diameter_mm + od_mm) / 2000 if coil_diameter_mm else None    # bend radius at the centreline, m
    De = Re * np.sqrt(R / Rc) if Rc else None
    S = R * u ** 2 * tau / (72 * NU_WATER * Rc) if Rc else 0.0              # Dean 1927 swirl strength
    turns = tube_length_m / (2 * np.pi * Rc) if Rc else None
    if Re > 2100:
        regime = "turbulent or transitional (unlikely at lab flows)"
        D = u * 2 * R * (3e7 / Re ** 2.1 + 1.35 / Re ** 0.125)          # Levenspiel correlation
    elif theta >= 0.8:
        regime = "laminar, Taylor dispersion"
        D = Dm + u ** 2 * R ** 2 / (48 * Dm)
    else:
        regime = "laminar, convection-dominated (wide spread)"
        D = None
    if D is not None:
        Pe = u * tube_length_m / D
        var = 2 / Pe - 2 / Pe ** 2 * (1 - np.exp(-Pe))                   # closed-vessel dispersion variance
        N_equiv = 1 / var
    else:
        N_equiv = None     # no tanks equivalent: run_tube uses the exact laminar curve instead
    return {"u_m_s": u, "tau_s": tau, "tau_min": tau / 60, "Re": Re, "theta": theta, "Dean": De,
            "regime": regime, "N_equiv": None if N_equiv is None else float(N_equiv), "tube_volume_mL": area * tube_length_m * 1e6,
            "S": float(S), "tube_od_mm": od_mm, "turns": turns, "coil_height_mm": turns * od_mm if turns else None}


def rtd_laminar(t, tau):
    """Exit-age curve for pure laminar flow in a straight tube: E(t) = tau^2 / (2 t^3) for t >= tau/2."""
    t = np.asarray(t, float)
    return np.where(t >= tau / 2, tau ** 2 / (2 * np.maximum(t, 1e-12) ** 3), 0.0)


def run_laminar(pH=7.5, Cl_dose_mgL=5.0, NH3_mgN_L=0.0, cipro_mgL=1.0, contact_min=30,
                after_bisulfite_min=5, p=cm.CIPRO, c=cb.CHLORINE, y_in=None, n=400):
    """
    Laminar convection (no mixing across the tube): each streamline is its own beaker, and the outlet
    mixes streamlines in proportion to the flow they carry ("segregated flow"). Uses the exact laminar
    exit-age curve, integrated in equal-flow slices: slice i leaves at t = tau / (2 sqrt(1 - F)).
    """
    y_in = cm.initial_state(Cl_dose_mgL, NH3_mgN_L, cipro_mgL) if y_in is None else y_in
    tau = contact_min * 60
    Fa, Fb = np.arange(n) / n, (np.arange(n) + 1) / n                  # equal-flow slices
    t_exit = tau * (np.sqrt(1 - Fa) - np.sqrt(1 - Fb)) * n            # exact mean exit time of each slice
    t_exit = np.maximum(t_exit, tau / 2)
    s = solve_ivp(
        cm.rates,[0, t_exit.max()], y_in, args=(pH, p, c), method="LSODA",
        dense_output=True, rtol=1e-8, atol=1e-16)
    y_end = s.sol(t_exit).mean(axis=1)
    y_out = cm.apply_bisulfite(y_end, pH, after_bisulfite_min, p)
    return cm.summarize(y_end, y_out, y_in[4]), y_end


# ------------------------------------------------------------------ particle model of the coil (added 10-21)
# Ported from the prototype simulator. Water parcels move along the tube at the laminar speed for their
# distance from the centre, jump sideways by diffusion, and ride the two-vortex swirl a bend sets up
# (exact low-Dean solution, Dean 1927: stream function psi = -S * y * (1-s)^2 * (4-s), s = x^2 + y^2,
# x pointing away from the coil axis). Dimensionless: tube radius 1, length 1, time in units of tau.
# Still a prediction: the dye test measures the real spread. Coil pitch is ignored.
def dean_stream(x, y):
    """Dean stream function without the strength S. Parcels with no diffusion keep this value."""
    s = x * x + y * y
    return -y * (1 - s) ** 2 * (4 - s)


def dean_swirl(x, y, S):
    """Sideways velocity (vx, vy) of the Dean swirl; zero at and beyond the wall."""
    s = x * x + y * y
    inside = s < 1
    H, Hp = (1 - s) ** 2 * (4 - s), -3 * (1 - s) * (3 - s)
    return np.where(inside, S * (H + 2 * y * y * Hp), 0.0), np.where(inside, -2 * S * x * y * Hp, 0.0)


def _step_parcels(x, y, z, dt, sig, S, rng):
    """One time step: swirl (midpoint rule), travel along the tube, diffusion, reflection at the wall."""
    xm, ym = x, y
    if S > 0:
        vx, vy = dean_swirl(x, y, S)
        xm, ym = x + 0.5 * dt * vx, y + 0.5 * dt * vy
        vx, vy = dean_swirl(xm, ym, S)
        x, y = x + dt * vx, y + dt * vy
    z = z + 2 * np.maximum(0.0, 1 - (xm * xm + ym * ym)) * dt
    if sig > 0:
        x = x + sig * rng.standard_normal(x.shape)
        y = y + sig * rng.standard_normal(y.shape)
    rr = np.hypot(x, y)
    out = rr > 1
    if out.any():
        scale = np.maximum(0.0, 2 - rr[out]) / rr[out]
        x, y = x.copy(), y.copy()
        x[out] *= scale
        y[out] *= scale
    return x, y, z


def _simulate_coil_cached(theta, S, n, seed, ports, tmax):
    rng = np.random.default_rng(seed)
    dt = min(0.002, 0.005 / max(theta, 1e-9), 0.02 / (4 * S) if S > 0 else 1.0)
    sig = np.sqrt(2 * theta * dt)
    # Parcels enter in proportion to the flow at their radius, so fast centre water is more common.
    radius = np.sqrt(1 - np.sqrt(1 - rng.random(n)))
    angle = 2 * np.pi * rng.random(n)
    x, y, z = radius * np.cos(angle), radius * np.sin(angle), np.zeros(n)
    times = np.full((n, len(ports)), float(tmax))       # a parcel still inside at tmax keeps tmax
    index, next_port, port_at = np.arange(n), np.zeros(n, int), np.asarray(ports, float)
    t = 0.0
    while t < tmax and index.size:
        z0 = z
        x, y, z = _step_parcels(x, y, z, dt, sig, S, rng)
        t += dt
        while True:                                     # record every port crossed in this step
            crossed = np.nonzero((next_port < port_at.size) & (z >= port_at[np.minimum(next_port, port_at.size - 1)]))[0]
            if not crossed.size:
                break
            target = port_at[next_port[crossed]]
            times[index[crossed], next_port[crossed]] = t - dt + dt * (target - z0[crossed]) / (z[crossed] - z0[crossed])
            next_port[crossed] += 1
        keep = next_port < port_at.size
        if not keep.all():
            x, y, z, index, next_port = x[keep], y[keep], z[keep], index[keep], next_port[keep]
    return times


_coil_cache = {}


def simulate_coil(theta, S, n=20000, seed=1, ports=PORTS, tmax=6.0):
    """
    Follow n water parcels through the tube. theta and S come from tube_hydraulics (S = 0: straight tube).
    Returns an n x len(ports) array of arrival times in units of tau. Results are kept, because strong
    swirl needs very small steps and the same tube is often run with several chemistries.
    """
    key = (round(float(theta), 12), round(float(S), 9), n, seed, tuple(ports), tmax)
    if key not in _coil_cache:
        _coil_cache[key] = _simulate_coil_cached(theta, S, n, seed, tuple(ports), tmax)
    return _coil_cache[key]


def spread_stats(times):
    """Spread of one port's arrival times: mean, tanks-equivalent N, and the T10 and T90 times."""
    times = np.asarray(times, float)
    return {"mean": float(times.mean()), "N": float(times.mean() ** 2 / times.var()),
            "t10": float(np.quantile(times, 0.1)), "t90": float(np.quantile(times, 0.9)), "first": float(times.min())}


def run_particles(tube_id_mm, tube_length_m, flow_mL_min, coil_diameter_mm=None, pH=7.5, Cl_dose_mgL=5.0,
                  NH3_mgN_L=0.0, cipro_mgL=1.0, after_bisulfite_min=5, p=cm.CIPRO, c=cb.CHLORINE, y_in=None,
                  n=20000, seed=1, tube_od_mm=None, diffusion=True, swirl=True):
    """
    Chemistry through the particle model: each parcel is its own beaker for as long as it stays in the tube,
    and a port's sample mixes the parcels arriving there. Returns (outlet summary, details), where details has
    the hydraulics, whether the swirl was used, and a summary and spread for each port (A, B, C, outlet).
    Above Dean 20 the swirl formula no longer holds, so the swirl is dropped: the straight-tube worst case.
    diffusion=False and swirl=False switch that physics off, for checks against textbook limits.
    """
    h = tube_hydraulics(tube_id_mm, tube_length_m, flow_mL_min, coil_diameter_mm, tube_od_mm=tube_od_mm)
    y_in = cm.initial_state(Cl_dose_mgL, NH3_mgN_L, cipro_mgL) if y_in is None else y_in
    too_strong = h["Dean"] is not None and h["Dean"] > DEAN_LIMIT
    S = 0.0 if too_strong or not swirl else h["S"]
    times = simulate_coil(h["theta"] if diffusion else 0.0, S, n=n, seed=seed) * h["tau_s"]
    s = solve_ivp(cm.rates, [0, times.max()], y_in, args=(pH, p, c), method="LSODA",
                  dense_output=True, rtol=1e-8, atol=1e-16)
    if not s.success:
        raise RuntimeError(s.message)
    ports = {}
    for j, (name, frac) in enumerate(zip(("A", "B", "C", "outlet"), PORTS)):
        y_end = s.sol(times[:, j]).mean(axis=1)
        y_out = cm.apply_bisulfite(y_end, pH, after_bisulfite_min, p)
        ports[name] = {"position": frac, "contact_min": h["tau_min"] * frac, "spread": spread_stats(times[:, j] / h["tau_s"] / frac),
                       "summary": cm.summarize(y_end, y_out, y_in[4])}
    note = f"Dean {h['Dean']:.0f} is above {DEAN_LIMIT}: swirl dropped, straight-tube worst case" if too_strong else None
    return ports["outlet"]["summary"], {"hydraulics": h, "ports": ports, "swirl_used": S > 0, "note": note}


def run_tube(tube_id_mm, tube_length_m, flow_mL_min, coil_diameter_mm=None, pH=7.5, Cl_dose_mgL=5.0,
             NH3_mgN_L=0.0, cipro_mgL=1.0, after_bisulfite_min=5, p=cm.CIPRO, c=cb.CHLORINE, y_in=None,
             flow="particles", n=20000, seed=1):
    """
    One call from the real tube to the outlet: tube size + pump flow -> flow pattern -> chemistry.
    flow="particles" (default) uses the particle model, with coiling and diffusion. flow="tanks" keeps the old
    shortcut: laminar with no diffusion when theta < 0.8, otherwise tanks-in-series, both with straight-tube
    physics. Turbulent flow (Re > 2,100) always uses tanks. Returns (summary, hydraulics).
    """
    h = tube_hydraulics(tube_id_mm, tube_length_m, flow_mL_min, coil_diameter_mm)
    if flow == "particles" and h["Re"] <= 2100:
        res, d = run_particles(tube_id_mm, tube_length_m, flow_mL_min, coil_diameter_mm, pH=pH, Cl_dose_mgL=Cl_dose_mgL,
                               NH3_mgN_L=NH3_mgN_L, cipro_mgL=cipro_mgL, after_bisulfite_min=after_bisulfite_min,
                               p=p, c=c, y_in=y_in, n=n, seed=seed)
        return res, dict(h, flow_model="particles", swirl_used=d["swirl_used"], note=d["note"],
                         N_particles=d["ports"]["outlet"]["spread"]["N"])
    if flow not in ("particles", "tanks"):
        raise ValueError(f"flow must be 'particles' or 'tanks', not {flow!r}")
    kw = dict(pH=pH, Cl_dose_mgL=Cl_dose_mgL, NH3_mgN_L=NH3_mgN_L, cipro_mgL=cipro_mgL,
              contact_min=h["tau_min"], after_bisulfite_min=after_bisulfite_min, p=p, c=c)
    if h["regime"].startswith("laminar, convection"):
        res, _ = run_laminar(y_in=y_in, **kw)
    else:
        res, _ = run_flow(N=max(1, int(round(h["N_equiv"]))), y_in=y_in, **kw)
    return res, dict(h, flow_model="tanks")


def run_flow(pH=7.5, Cl_dose_mgL=5.0, NH3_mgN_L=0.0, cipro_mgL=1.0, contact_min=30, N=5,
             after_bisulfite_min=5, p=cm.CIPRO, c=cb.CHLORINE, y_in=None):
    """
    Contact chamber with N tanks. Doses are concentrations AFTER mixing at the inlet (how plants report them).
    Bisulfite is added at the outlet; then after_bisulfite_min of travel to the discharge point.
    CT is carried along with the water, so the outlet CT is the flow-averaged CT.
    Returns (summary dict like cipro_model.run_batch, list of tank states).
    """
    y_in = cm.initial_state(Cl_dose_mgL, NH3_mgN_L, cipro_mgL) if y_in is None else y_in
    tau = contact_min * 60
    states = steady_tanks(lambda y: cm.rates(0, y, pH, p, c), y_in, tau, N)
    y_end = states[-1]
    y_out = cm.apply_bisulfite(y_end, pH, after_bisulfite_min, p)
    return cm.summarize(y_end, y_out, y_in[4]), states
