"""Simpler models the full chemistry model has to beat.

drug_only     : cipro reacts with chlorine in < 1 s, so it is 'gone'; nothing else is tracked.
fitted_curve  : one exponential decay C/C0 = exp(-k t) fitted to data; no pH, no chemistry.
"""
import numpy as np
from scipy.optimize import curve_fit


def drug_only(t_min):
    """Predicted (cipro as measured)/C0: zero once chlorine is added."""
    return np.where(np.asarray(t_min, float) > 0, 0.0, 1.0)


def fit_curve(t_min, c):
    """Fit k (per minute) to C/C0 data. Returns k."""
    (k,), _ = curve_fit(lambda t, k: np.exp(-k * t), np.asarray(t_min, float), np.asarray(c, float), p0=[0.04])
    return k


def fitted_curve(t_min, k):
    return np.exp(-k * np.asarray(t_min, float))
