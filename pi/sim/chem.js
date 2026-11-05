// Chemistry on the simulated bench. All constants and equations come from web/model.js, which
// tests/test_js_matches_python.py keeps in step with ris/*.py. Nothing about the chemistry lives here.
// Each slice of water in the coil is treated as its own beaker: its dose comes from the shares the pumps
// really delivered, and its reaction time is how long ago it passed the tee. Plug flow, no spread.
const SimChem = (function () {
  const CHUNK_S = 4 * 3600;

  function make(RIS, settings) {
    const params = { ...RIS.DEFAULTS, k_rev_bisulfite: settings.k_rev };
    const cache = new Map();

    function table(feedShare, clShare, age) {
      const key = feedShare.toFixed(3) + "/" + clShare.toFixed(3);
      let t = cache.get(key);
      if (!t || t.tEnd < age) {
        if (cache.size > 300) cache.clear();
        const tEnd = Math.max(CHUNK_S, (t ? t.tEnd : 0) * 2, age);
        const y0 = RIS.initial({
          Cl_mgL: settings.stock_mgL * clShare, NH3_mgN_L: settings.nh3_mgN_L * feedShare,
          cipro_mgL: settings.feed_mgL * feedShare, mode: settings.nh3_mgN_L > 0 ? "together" : "free",
        });
        t = { ...RIS.integrate(y0, params, settings.pH, tEnd, 15), tEnd, C0: y0[4] };
        cache.set(key, t);
      }
      return t;
    }

    function at(t, age) {
      const T = t.T;
      let lo = 0, hi = T.length - 1;
      while (hi - lo > 1) { const m = (lo + hi) >> 1; if (T[m] <= age) lo = m; else hi = m; }
      const f = Math.min(1, Math.max(0, (age - T[lo]) / ((T[hi] - T[lo]) || 1)));
      return t.Y[lo].map((v, i) => v + f * (t.Y[hi][i] - v));
    }

    // One slice: feed and chlorine shares of its volume, and its age in seconds.
    function slice(feedShare, clShare, age) {
      const t = table(feedShare, clShare, age), y = at(t, age);
      const q = RIS.bisulfite(y, params, settings.pH, settings.hold_min);
      const ug = v => Math.max(v, 0) * RIS.MW_CIP * 1e6, mg = v => Math.max(v, 0) * RIS.MW_CL2 * 1000;
      return {
        age_min: age / 60,
        dose_mgL: settings.stock_mgL * clShare, cipro0_mgL: settings.feed_mgL * feedShare,
        fc_mgL: mg(y[0]), cc_mgL: mg(y[2] + 2 * y[8]),
        cipro_ugL: ug(y[4]), ncl_ugL: ug(y[5]), p1_ugL: ug(y[6]), p2_ugL: ug(y[7]),
        quenched_cipro_ugL: ug(q[4]),
        core_pct: t.C0 > 0 ? 100 * (y[4] + y[5] + y[6] + y[7]) / t.C0 : 0,
      };
    }
    return { slice };
  }
  return { make };
})();
if (typeof module !== "undefined") module.exports = SimChem;
