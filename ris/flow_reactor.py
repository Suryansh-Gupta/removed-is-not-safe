"""
flow_reactor.py  —  tanks-in-series model of the coiled-tube contact chamber
=============================================================================
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


def tube_hydraulics(tube_id_mm, tube_length_m, flow_mL_min, coil_diameter_mm=None, Dm=D_CIPRO):
    """
    Predict how water moves through a straight or coiled tube BEFORE the dye test.
      u        mean speed, m/s           tau   mean residence time, s (tube volume / flow)
      Re       Reynolds number (laminar below ~2,100)
      theta    Dm * tau / R^2: how far a molecule diffuses across the tube during its stay.
               theta >~ 0.8 -> Taylor dispersion (diffusion evens out the speed differences, narrow spread)
               theta << 0.8 -> laminar convection (centre water moves 2x the average, wide spread)
      De       Dean number, for coiled tubes. Coiling stirs the flow sideways and narrows the spread;
               this straight-tube estimate is then the WORST case (widest spread). The dye test decides.
      N_equiv  tanks-in-series number with the same spread (variance) as the predicted flow pattern
    """
    R = tube_id_mm / 2000
    area = np.pi * R ** 2
    Q = flow_mL_min * 1e-6 / 60
    u = Q / area
    tau = tube_length_m / u
    Re = u * 2 * R / NU_WATER
    theta = Dm * tau / R ** 2
    De = Re * np.sqrt(2 * R / (coil_diameter_mm / 1000)) if coil_diameter_mm else None
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
            "regime": regime, "N_equiv": None if N_equiv is None else float(N_equiv), "tube_volume_mL": area * tube_length_m * 1e6}


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


def run_tube(tube_id_mm, tube_length_m, flow_mL_min, coil_diameter_mm=None, pH=7.5, Cl_dose_mgL=5.0,
             NH3_mgN_L=0.0, cipro_mgL=1.0, after_bisulfite_min=5, p=cm.CIPRO, c=cb.CHLORINE, y_in=None):
    """
    One call from the real tube to the outlet: tube size + pump flow -> flow pattern -> chemistry.
    Picks laminar convection or tanks-in-series from tube_hydraulics. Returns (summary, hydraulics).
    """
    h = tube_hydraulics(tube_id_mm, tube_length_m, flow_mL_min, coil_diameter_mm)
    kw = dict(pH=pH, Cl_dose_mgL=Cl_dose_mgL, NH3_mgN_L=NH3_mgN_L, cipro_mgL=cipro_mgL,
              contact_min=h["tau_min"], after_bisulfite_min=after_bisulfite_min, p=p, c=c)
    if h["regime"].startswith("laminar, convection"):
        res, _ = run_laminar(y_in=y_in, **kw)
    else:
        res, _ = run_flow(N=max(1, int(round(h["N_equiv"]))), y_in=y_in, **kw)
    return res, h


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
