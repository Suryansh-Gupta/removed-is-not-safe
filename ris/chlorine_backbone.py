"""
chlorine_backbone.py  —  shared chlorine chemistry for Removed Is Not Safe
==========================================================================
Used by BOTH notebooks:
  * chlorine_backbone.ipynb  (Deliverable 1)
  * cipro_reactions.ipynb    (Deliverable 2)

Change a chlorine constant HERE and only here. Both notebooks pick it up the
next time they run, so the two models can never disagree about chlorine.
Every value must also be in the rate_constants sheet with its source.

What this file knows about:
  FC   free chlorine (HOCl + OCl-), mol/L
  TA   total ammonia (NH4+ + NH3), mol/L
  MCA  monochloramine (NH2Cl), mol/L
  CT   running total of free chlorine x time, mg*min/L
"""

import numpy as np

# ---------------------------------------------------------------- constants
MW_Cl2 = 70.9     # g/mol. Chlorine is reported "as Cl2"
MW_N   = 14.0     # g/mol. Ammonia is reported "as N"

CHLORINE = {
    "pKa_HOCl":   7.54,    # Morris 1966, J. Phys. Chem. (verify in paper)
    "pKa_NH4":    9.25,    # Bates & Pinching 1949
    "k_NH3_HOCl": 3.07e6,  # M^-1 s^-1, Qiang & Adams 2004 (verified from abstract)
    "k_hyd_NH2Cl": 2.1e-5, # s^-1, NH2Cl + H2O -> HOCl + NH3 (Jafvert & Valentine 1992)
    "k_demand":   2e-4,    # s^-1, PLACEHOLDER: fit to published residual chlorine, then to own DPD data (Nov)
    # --- Dichloramine (added 10-15). Unified chloramine model (Jafvert & Valentine 1992; Vikesland 2001),
    # values as tabulated per HOUR in a UC thesis (escholarship qt7br7t6dn, Table 4.1), converted here to s^-1.
    "k_HOCl_NH2Cl": 1.0e6 / 3600,   # 278 M^-1 s^-1   HOCl + NH2Cl -> NHCl2
    "k_hyd_NHCl2":  2.3e-3 / 3600,  # 6.4e-7 s^-1     NHCl2 + H2O -> HOCl + NH2Cl
    "k_NHCl2_NH3":  2.2e8 / 3600,   # 6.1e4 M^-1 s^-1 NHCl2 + NH3 -> 2 NH2Cl
    # 2 NH2Cl -> NHCl2 + NH3, kd = kH[H+] + kH2CO3[H2CO3] + kHCO3[HCO3-]  (M^-2 h^-1 in the table)
    "kd_H":     2.5e7 / 3600,       # 6.9e3 M^-2 s^-1
    "kd_H2CO3": 4.0e4 / 3600,       # 11 M^-2 s^-1
    "kd_HCO3":  8.0e2 / 3600,       # 0.22 M^-2 s^-1
    "C_T_carbonate": 0.0,           # M, total carbonate. Lab water ~0; real effluent ~2-4e-3 (measure alkalinity)
    # Not modelled: dichloramine self-decomposition (slow) and phosphate-buffer catalysis (constant unknown).
}

# ---------------------------------------------------------------- helpers
def mgL_Cl2_to_M(x):
    """mg/L as Cl2 -> mol/L"""
    return x / 1000 / MW_Cl2

def M_to_mgL_Cl2(x):
    """mol/L -> mg/L as Cl2"""
    return np.asarray(x) * MW_Cl2 * 1000

def mgN_L_to_M(x):
    """mg/L as N -> mol/L"""
    return x / 1000 / MW_N


def fraction_acid_form(pH, pKa):
    """Fraction of a chemical still holding its H+ (standard acid-base formula)."""
    return 1 / (1 + 10 ** (pH - pKa))


def speciation(pH, c=CHLORINE):
    """Return (fraction of free chlorine that is HOCl, fraction of ammonia that is NH3)."""
    a_HOCl = fraction_acid_form(pH, c["pKa_HOCl"])        # HOCl = chlorine's acid form
    a_NH3 = 1 - fraction_acid_form(pH, c["pKa_NH4"])      # NH3 = ammonia's NON-acid form
    return a_HOCl, a_NH3


def backbone_rates_full(FC, TA, MCA, DCA, pH, c=CHLORINE):
    """
    Same as backbone_rates, plus dichloramine (DCA = NHCl2, mol/L).
    Returns ([dFC, dTA, dMCA, dDCA, dCT], HOCl). Chlorine atoms are conserved: FC + MCA + 2*DCA
    changes only through k_demand (and, in the cipro model, reactions with cipro).
    """
    a_HOCl, a_NH3 = speciation(pH, c)
    HOCl, NH3 = a_HOCl * FC, a_NH3 * TA
    h = 10.0 ** -pH
    CT = c.get("C_T_carbonate", 0.0)
    K1, K2 = 10 ** -6.35, 10 ** -10.33
    den = h * h + K1 * h + K1 * K2
    H2CO3, HCO3 = CT * h * h / den, CT * K1 * h / den
    kd = c.get("kd_H", 0) * h + c.get("kd_H2CO3", 0) * H2CO3 + c.get("kd_HCO3", 0) * HCO3

    r_form  = c["k_NH3_HOCl"] * HOCl * NH3                 # HOCl + NH3 -> NH2Cl
    r_hyd   = c.get("k_hyd_NH2Cl", 0.0) * MCA              # NH2Cl -> HOCl + NH3
    r_dca   = c.get("k_HOCl_NH2Cl", 0.0) * HOCl * MCA      # HOCl + NH2Cl -> NHCl2
    r_hyd2  = c.get("k_hyd_NHCl2", 0.0) * DCA              # NHCl2 -> HOCl + NH2Cl
    r_back  = c.get("k_NHCl2_NH3", 0.0) * DCA * NH3        # NHCl2 + NH3 -> 2 NH2Cl
    r_disp  = kd * MCA * MCA                               # 2 NH2Cl -> NHCl2 + NH3
    r_dem   = c["k_demand"] * FC

    dFC  = -r_form + r_hyd - r_dca + r_hyd2 - r_dem
    dTA  = -r_form + r_hyd - r_back + r_disp
    dMCA = r_form - r_hyd - r_dca + r_hyd2 + 2 * r_back - 2 * r_disp
    dDCA = r_dca - r_hyd2 - r_back + r_disp
    dCT  = FC * MW_Cl2 * 1000 / 60
    return [dFC, dTA, dMCA, dDCA, dCT], HOCl


def backbone_rates(FC, TA, MCA, pH, c=CHLORINE):
    """
    How fast free chlorine, ammonia, chloramine and CT change RIGHT NOW,
    from chlorine chemistry alone (no ciprofloxacin).

    Returns
      d    : [dFC/dt, dTA/dt, dMCA/dt, dCT/dt]  (mol/L/s, except CT in mg*min/L per s)
      HOCl : concentration of HOCl right now, mol/L  (cipro model needs this)

    The cipro model calls this, then SUBTRACTS what cipro uses from dFC and dMCA.
    That subtraction is the two-way link: chlorine sets how fast cipro reacts,
    and cipro's reactions use up chlorine.
    """
    a_HOCl, a_NH3 = speciation(pH, c)
    HOCl = a_HOCl * FC                                    # reactive part of chlorine
    NH3 = a_NH3 * TA                                      # reactive part of ammonia

    r_chloramine = c["k_NH3_HOCl"] * HOCl * NH3           # HOCl + NH3 -> NH2Cl
    r_hyd = c.get("k_hyd_NH2Cl", 0.0) * MCA               # NH2Cl -> HOCl + NH3 (slow)
    r_demand = c["k_demand"] * FC                         # chlorine eaten by organics

    dFC = -r_chloramine - r_demand + r_hyd
    dTA = -r_chloramine + r_hyd
    dMCA = +r_chloramine - r_hyd
    dCT = FC * MW_Cl2 * 1000 / 60                         # mg/L x min, from free chlorine
    return [dFC, dTA, dMCA, dCT], HOCl
