"""
cipro_model.py  —  shared ciprofloxacin + chlorine chemistry for Removed Is Not Safe
====================================================================================
Imported by cipro_reactions.ipynb (D2), flow_reactor.ipynb (D3) and later the optimizer.
Change a cipro constant HERE and only here. Chlorine constants live in chlorine_backbone.py.

Main source: Dodd, Shah, von Gunten & Huang 2005, Environ. Sci. Technol. 39:7065-7076,
doi 10.1021/es050054e  ("Dodd 2005" below). Page numbers refer to the journal pages.

What Dodd 2005 found (Scheme 1, p. 7069-7071):
  cipro + HOCl  -> N-chloro-cipro ("CF-Ia1")        very fast, at the piperazine N(4)
  CF-Ia1        -> CF-Pa1  (~100% yield)             slow, minutes; piperazine ring breaks
  CF-Pa1 + HOCl -> CF-Ia2 -> CF-Pa2 -> ... CF-Pa3     slower further breakdown
  ALL of these products keep the quinolone core (the part that attacks bacteria).
  Dodd p. 7075: "a majority of the transformation products ... may retain antibacterial activity."
  Thiosulfate and sulfite turn CF-Ia1 back into cipro (p. 7069, 7071, 7073).

State variables (mol/L unless noted), same order everywhere:
  0 FC   free chlorine          4 CIP  ciprofloxacin
  1 TA   total ammonia          5 NCL  N-chloro-cipro (CF-Ia1)
  2 MCA  combined chlorine      6 P1   first product (CF-Pa1), keeps quinolone core
  3 CT   mg*min/L               7 P2   later products (CF-Pa2/Pa3 lumped), keep quinolone core
"""

import numpy as np
from scipy.integrate import solve_ivp
from . import chlorine_backbone as cb

MW_cipro = 331.35  # g/mol, Dodd 2005 Table 1

STATE = ["FC", "TA", "MCA", "CT", "CIP", "NCL", "P1", "P2"]

# ------------------------------------------------------------------ constants
CIPRO = {
    # Acid-base: Dodd 2005 Table 1 (citing Vazquez 2001)
    "pKa1": 6.2,
    "pKa2": 8.8,
    # HOCl + each cipro form, M^-1 s^-1. Dodd 2005 Table 3, 22 C. (+- standard error)
    "k_HOCl_cation":  4.3e3,   # +- 6.6e3 (very uncertain; barely matters near neutral pH)
    "k_HOCl_neutral": 3.8e5,   # +- 2.4e5 (zwitterion + neutral lumped)
    "k_HOCl_anion":   4.9e7,   # +- 1.9e7
    # OCl- reactions: negligible (Dodd 2005 p. 7068)
    # CF-Ia1 fragmentation, s^-1. Dodd 2005 p. 7071: pH-dependent, 2.4e-4 (pH 4.6) to 7.6e-4 (pH 8.6),
    # rising as the carboxyl group loses its H+. Exact species values are in Dodd's Supporting Info
    # Fig. S7 (not in our PDF). ESTIMATE: treat the pH 4.6 and 8.6 values as the neutral- and
    # anion-form rates, switching at pKa_int.
    "k_frag_neutral": 2.4e-4,
    "k_frag_anion":   7.6e-4,
    "pKa_int": 6.2,            # ASSUMPTION: carboxyl pKa of CF-Ia1 ~ cipro's pKa1
    # Combined chlorine (chloramine) + cipro, M^-1 s^-1.
    # Dodd 2005 p. 7074: k'_initial = 4.4e-4 s^-1 at pH 7, 1.4 uM cipro, 15 uM combined chlorine
    # (63% NH2Cl, 37% NHCl2)  ->  4.4e-4 / 15e-6 = 29. ASSUMES rate is proportional to [CC].
    "k_CC_cipro": 29.0,
    # CF-Pa1 + HOCl -> later products, M^-1 s^-1. ROUGH ESTIMATE from Dodd 2005 Fig. 3:
    # CF-Pa1 signal falls ~0.92 -> 0.53 between 60 and 120 min at FAC ~1.3e-5 M, pH 6.5.
    "k_P1_HOCl": 13.0,
    # Bisulfite turning CF-Ia1 back into cipro, s^-1. UNKNOWN: Gap 2, you measure this.
    # Dodd shows thiosulfate does it and says sulfite should (p. 7073), but gives no rate.
    "k_rev_bisulfite": 0.0,
}

# Low / high values for sensitivity tests (from Dodd's standard errors or stated assumptions)
RANGES = {
    "k_HOCl_cation":   (4.3e2, 1.1e4),
    "k_HOCl_neutral":  (1.4e5, 6.2e5),
    "k_HOCl_anion":    (3.0e7, 6.8e7),
    "k_frag_neutral":  (1.7e-4, 3.1e-4),
    "k_frag_anion":    (5.6e-4, 9.0e-4),   # 5.6e-4 = Jasper 2016 at pH 8.7; 9e-4 = Jasper with chloramine
    "pKa_int":         (5.5, 7.0),
    "k_CC_cipro":      (15.0, 60.0),
    "k_P1_HOCl":       (3.0, 50.0),
    "k_rev_bisulfite": (0.0, 1e-1),
}

# ------------------------------------------------------------------ helpers
def mgL_to_M(x):
    return x / 1000 / MW_cipro

def M_to_ugL(x):
    """mol/L -> ug/L cipro-equivalent (negative solver noise clipped to 0)."""
    return np.maximum(np.asarray(x, float), 0) * MW_cipro * 1e6


def cipro_fractions(pH, p=CIPRO):
    """Fractions of cipro as cation, neutral/zwitterion, anion (add to 1)."""
    h, K1, K2 = 10.0 ** -pH, 10.0 ** -p["pKa1"], 10.0 ** -p["pKa2"]
    D = h * h + K1 * h + K1 * K2
    return h * h / D, K1 * h / D, K1 * K2 / D


def k_HOCl_eff(pH, p=CIPRO):
    """Speciation-weighted cipro + HOCl rate constant, M^-1 s^-1 (Dodd 2005 eq 2)."""
    a_cat, a_neu, a_an = cipro_fractions(pH, p)
    return a_cat * p["k_HOCl_cation"] + a_neu * p["k_HOCl_neutral"] + a_an * p["k_HOCl_anion"]


def k_frag(pH, p=CIPRO):
    """CF-Ia1 fragmentation rate at this pH, s^-1."""
    a_an = 1 - cb.fraction_acid_form(pH, p["pKa_int"])
    return (1 - a_an) * p["k_frag_neutral"] + a_an * p["k_frag_anion"]


# ------------------------------------------------------------------ rate equations
def rates(t, y, pH, p=CIPRO, c=cb.CHLORINE):
    """How fast all 8 state variables change right now (no flow)."""
    FC, TA, MCA, CT, CIP, NCL, P1, P2 = y
    (dFC, dTA, dMCA, dCT), HOCl = cb.backbone_rates(FC, TA, MCA, pH, c)   # chlorine part

    r_HOCl = k_HOCl_eff(pH, p) * HOCl * CIP     # cipro + HOCl  -> CF-Ia1
    r_CC   = p["k_CC_cipro"] * MCA * CIP        # cipro + NH2Cl -> CF-Ia1
    r_frag = k_frag(pH, p) * NCL                # CF-Ia1 -> CF-Pa1
    r_P1   = p["k_P1_HOCl"] * HOCl * P1         # CF-Pa1 + HOCl -> later products

    dFC  -= r_HOCl + r_P1                       # two-way link: cipro uses up chlorine
    dMCA -= r_CC                                # (1 mol chlorine per mol cipro, Dodd p. 7069)

    return [dFC, dTA, dMCA, dCT,
            -r_HOCl - r_CC,
            r_HOCl + r_CC - r_frag,
            r_frag - r_P1,
            r_P1]


def after_bisulfite_rates(t, z, pH, p=CIPRO):
    """After bisulfite: chlorine is gone. CF-Ia1 keeps breaking apart, or turns back into cipro."""
    CIP, NCL, P1, P2 = z
    r_rev, r_frag = p["k_rev_bisulfite"] * NCL, k_frag(pH, p) * NCL
    return [r_rev, -r_rev - r_frag, r_frag, 0.0]


# ------------------------------------------------------------------ one call = one experiment
def initial_state(Cl_dose_mgL, NH3_mgN_L, cipro_mgL):
    return [cb.mgL_Cl2_to_M(Cl_dose_mgL), cb.mgN_L_to_M(NH3_mgN_L), 0.0, 0.0,
            mgL_to_M(cipro_mgL), 0.0, 0.0, 0.0]


def apply_bisulfite(y_end, pH, minutes, p=CIPRO):
    """Take the 8-variable state at the end of contact; return CIP, NCL, P1, P2 after `minutes`."""
    z0 = list(y_end[4:8])
    if minutes <= 0:
        return np.array(z0)
    d = solve_ivp(after_bisulfite_rates, [0, minutes * 60], z0, args=(pH, p),
                  method="LSODA", rtol=1e-8, atol=1e-16)
    return d.y[:, -1]


def summarize(y_end, y_out, C0):
    """Turn raw end-of-contact and after-bisulfite states into readable numbers."""
    return {
        "FC_end_mgL":   float(cb.M_to_mgL_Cl2(y_end[0])),
        "CC_end_mgL":   float(cb.M_to_mgL_Cl2(y_end[2])),
        "CT":           float(y_end[3]),
        "cipro_end_ugL":            float(M_to_ugL(y_end[4])),
        "NCL_end_ugL":              float(M_to_ugL(y_end[5])),
        "cipro_thiosulfate_ugL":    float(M_to_ugL(y_end[4] + y_end[5])),  # what a thiosulfate-quenched lab sample reads
        "cipro_out_ugL":            float(M_to_ugL(y_out[0])),             # after bisulfite = leaves the plant
        "NCL_out_ugL":              float(M_to_ugL(y_out[1])),
        "P1_out_ugL":               float(M_to_ugL(y_out[2])),
        "P2_out_ugL":               float(M_to_ugL(y_out[3])),
        "drug_only_removal_pct":    float(100 * (1 - max(y_out[0], 0) / C0)),
        "core_remaining_pct":       float(100 * sum(max(v, 0) for v in y_out) / C0),  # all forms keep the core
    }


def run_batch(pH=7.5, Cl_dose_mgL=5.0, NH3_mgN_L=0.0, cipro_mgL=1.0, contact_min=30,
              after_bisulfite_min=5, p=CIPRO, c=cb.CHLORINE, n_points=400):
    """
    Beaker (batch) experiment: add chlorine, wait contact_min, add bisulfite, wait after_bisulfite_min.
    Returns (summary dict, solver result for the contact period).
    """
    y0 = initial_state(Cl_dose_mgL, NH3_mgN_L, cipro_mgL)
    t_end = contact_min * 60
    sol = solve_ivp(rates, [0, t_end], y0, args=(pH, p, c), method="LSODA",
                    t_eval=np.linspace(0, t_end, n_points), rtol=1e-8, atol=1e-16)
    if not sol.success:
        raise RuntimeError(sol.message)
    y_end = sol.y[:, -1]
    y_out = apply_bisulfite(y_end, pH, after_bisulfite_min, p)
    return summarize(y_end, y_out, y0[4]), sol
