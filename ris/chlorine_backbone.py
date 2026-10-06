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
    "k_demand":   2e-4,    # s^-1, PLACEHOLDER: fit to published residual chlorine, then to own DPD data (Nov)
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
    r_demand = c["k_demand"] * FC                         # chlorine eaten by organics

    dFC = -r_chloramine - r_demand
    dTA = -r_chloramine
    dMCA = +r_chloramine
    dCT = FC * MW_Cl2 * 1000 / 60                         # mg/L x min, from free chlorine
    return [dFC, dTA, dMCA, dCT], HOCl
