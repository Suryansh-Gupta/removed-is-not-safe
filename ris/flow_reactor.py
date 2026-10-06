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


def run_flow(pH=7.5, Cl_dose_mgL=5.0, NH3_mgN_L=0.0, cipro_mgL=1.0, contact_min=30, N=5,
             after_bisulfite_min=5, p=cm.CIPRO, c=cb.CHLORINE):
    """
    Contact chamber with N tanks. Doses are concentrations AFTER mixing at the inlet (how plants report them).
    Bisulfite is added at the outlet; then after_bisulfite_min of travel to the discharge point.
    CT is carried along with the water, so the outlet CT is the flow-averaged CT.
    Returns (summary dict like cipro_model.run_batch, list of tank states).
    """
    y_in = cm.initial_state(Cl_dose_mgL, NH3_mgN_L, cipro_mgL)
    tau = contact_min * 60
    states = steady_tanks(lambda y: cm.rates(0, y, pH, p, c), y_in, tau, N)
    y_end = states[-1]
    y_out = cm.apply_bisulfite(y_end, pH, after_bisulfite_min, p)
    return cm.summarize(y_end, y_out, y_in[4]), states
