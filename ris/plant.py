"""
plant.py  —  the San José–Santa Clara Regional Wastewater Facility as a model scenario
=====================================================================================
Plant numbers come from the plant's written answers to our questions (email, received by 2026-11-16;
personal communication, not a published source). Chemistry constants stay in chlorine_backbone.py and
cipro_model.py; this file only holds the operating conditions that run_batch() is called with.

Temperature: the plant gave 20.9-24.9 C (October, final effluent after dechlorination). The model has no
temperature term; Dodd 2005 measured its cipro rate constants at 22 C, inside that range, so they are used as is.
"""

SAN_JOSE = {
    # ~40 min chlorine contact before dechlorination at average flow (plant's written answer 1).
    "contact_min": 40,
    # ~1.8 mg/L on average, "based on the volume of water passing" (plant's written answer 2).
    # ASSUMPTION: this is the dose (chemical fed per volume of flow), not the end-of-basin residual.
    # The wording describes a flow-paced feed rate, which is how a dose is worked out; a residual is read
    # off an analyzer. Chloramine decays slowly, so the model's end residual is close to the dose anyway.
    "Cl_dose_mgL": 1.8,
    # pH 6.9-7.0 (plant's written answer 4).
    "pH": 7.0,
    # Ammonia present when chlorine is added, mg N/L. ESTIMATE: the plant adds ammonia to make chloramine and
    # stays in Zone 2 of the breakpoint curve (answer 2), i.e. below the ~5:1 Cl2:N mass ratio where
    # monochloramine peaks. 0.5 mg N/L gives 3.6:1 at 1.8 mg/L. The real ammonia level was not given.
    "NH3_mgN_L": 0.5,
    # EXAMPLE: typical effluent ciprofloxacin, same 1 ug/L as the web app's preset. Not a plant measurement.
    "cipro_mgL": 0.001,
    # EXAMPLE: time from bisulfite to discharge. Not given by the plant.
    "after_bisulfite_min": 5,
}
# ASSUMPTION: ammonia and hypochlorite are added into the flowing water (run_batch's "together" chemistry),
# not as chloramine made in a separate tank. The plant did not say which.
