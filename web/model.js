// Removed Is Not Safe: chlorine + ciprofloxacin model (JavaScript port of ris/*.py)
// State: [FC, TA, MCA, CT, CIP, NCL, P1, P2, DCA]  (mol/L; CT in mg*min/L; DCA = dichloramine, added 10-15)
const RIS = (function () {
  const MW_CL2 = 70.9, MW_N = 14.0, MW_CIP = 331.35, NS = 9;
  const DEFAULTS = {
    pKa_HOCl: 7.54, pKa_NH4: 9.25, k_NH3_HOCl: 3.07e6, k_hyd_NH2Cl: 2.1e-5, k_demand: 2e-4,        // Morris 1966; Qiang & Adams 2004
    // Dichloramine (unified chloramine model, Jafvert & Valentine 1992 / Vikesland 2001; per-hour table values / 3600)
    k_HOCl_NH2Cl: 1.0e6 / 3600, k_hyd_NHCl2: 2.3e-3 / 3600, k_NHCl2_NH3: 2.2e8 / 3600,
    kd_H: 2.5e7 / 3600, kd_H2CO3: 4.0e4 / 3600, kd_HCO3: 8.0e2 / 3600, C_T_carbonate: 0,
    pKa1: 6.2, pKa2: 8.8,                                                      // Dodd 2005 Table 1
    k_HOCl_cation: 4.3e3, k_HOCl_neutral: 3.8e5, k_HOCl_anion: 4.9e7,          // Dodd 2005 Table 3
    k_frag_neutral: 2.4e-4, k_frag_anion: 7.6e-4, pKa_int: 6.2,                // Dodd 2005 p. 7071 (split = estimate)
    k_CC_cipro: 29, k_P1_HOCl: 13, n_Cl_P1: 2, k_rev_bisulfite: 0,             // Dodd p. 7074; Fig 3 estimate; unknown
  };
  const NU_WATER = 0.95e-6, D_CIPRO = 7e-10;                                   // m^2/s; cipro diffusivity is an ESTIMATE
  const acid = (pH, pKa) => 1 / (1 + Math.pow(10, pH - pKa));

  function consts(p, pH) {
    const h = Math.pow(10, -pH), K1 = Math.pow(10, -p.pKa1), K2 = Math.pow(10, -p.pKa2);
    const D = h * h + K1 * h + K1 * K2;
    const aCat = h * h / D, aNeu = K1 * h / D, aAn = K1 * K2 / D;
    const aInt = 1 - acid(pH, p.pKa_int);
    const C1 = Math.pow(10, -6.35), C2 = Math.pow(10, -10.33), dC = h * h + C1 * h + C1 * C2;
    const kd = p.kd_H * h + p.kd_H2CO3 * p.C_T_carbonate * h * h / dC + p.kd_HCO3 * p.C_T_carbonate * C1 * h / dC;
    return {
      aHOCl: acid(pH, p.pKa_HOCl), aNH3: 1 - acid(pH, p.pKa_NH4), kd,
      kH: aCat * p.k_HOCl_cation + aNeu * p.k_HOCl_neutral + aAn * p.k_HOCl_anion,
      kf: (1 - aInt) * p.k_frag_neutral + aInt * p.k_frag_anion,
      frac: [aCat, aNeu, aAn],
    };
  }

  function rates(y, p, c, out) {
    const FC = y[0], TA = y[1], MCA = y[2], CIP = y[4], NCL = y[5], P1 = y[6], DCA = y[8];
    const HOCl = c.aHOCl * FC, NH3 = c.aNH3 * TA, CC = MCA + DCA;
    const rMCA = p.k_NH3_HOCl * HOCl * NH3, rDem = p.k_demand * FC, rHyd = p.k_hyd_NH2Cl * MCA;
    const rDCA = p.k_HOCl_NH2Cl * HOCl * MCA, rHyd2 = p.k_hyd_NHCl2 * DCA;
    const rBack = p.k_NHCl2_NH3 * DCA * NH3, rDisp = c.kd * MCA * MCA;
    const rH = c.kH * HOCl * CIP, rCC = p.k_CC_cipro * CC * CIP, rF = c.kf * NCL, rP = p.k_P1_HOCl * HOCl * P1;
    const fM = CC > 0 ? MCA / CC : 0, fD = CC > 0 ? DCA / CC : 0;
    out[0] = -rMCA + rHyd - rDCA + rHyd2 - rDem - rH - p.n_Cl_P1 * rP;
    out[1] = -rMCA + rHyd - rBack + rDisp + rCC * fM;
    out[2] = rMCA - rHyd - rDCA + rHyd2 + 2 * rBack - 2 * rDisp + rCC * (fD - fM);
    out[3] = FC * MW_CL2 * 1000 / 60;
    out[4] = -rH - rCC;
    out[5] = rH + rCC - rF;
    out[6] = rF - rP;
    out[7] = rP;
    out[8] = rDCA - rHyd2 - rBack + rDisp - rCC * fD;
  }

  // ---- linear algebra for the implicit solver
  function solve(A, b) {
    const n = b.length;
    for (let i = 0; i < n; i++) {
      let piv = i;
      for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[piv][i])) piv = r;
      [A[i], A[piv]] = [A[piv], A[i]]; [b[i], b[piv]] = [b[piv], b[i]];
      const d = A[i][i] || 1e-300;
      for (let r = i + 1; r < n; r++) {
        const f = A[r][i] / d;
        if (f) { for (let k = i; k < n; k++) A[r][k] -= f * A[i][k]; b[r] -= f * b[i]; }
      }
    }
    const x = new Array(n);
    for (let i = n - 1; i >= 0; i--) {
      let s = b[i];
      for (let k = i + 1; k < n; k++) s -= A[i][k] * x[k];
      x[i] = s / (A[i][i] || 1e-300);
    }
    return x;
  }

  // One backward-Euler step: y_new = y + dt * F(y_new), F(y) = rates(y) + extra(y)
  // extra(y) adds flow terms for tanks: (yin - y)/th
  function beStep(y, dt, f) {
    const n = y.length, F0 = new Array(n), F1 = new Array(n);
    let z = y.slice();
    for (let it = 0; it < 8; it++) {
      f(z, F0);
      const G = z.map((v, i) => v - y[i] - dt * F0[i]);
      const J = [];
      for (let j = 0; j < n; j++) J.push(new Array(n).fill(0));
      for (let j = 0; j < n; j++) {
        const h = 1e-7 * Math.max(Math.abs(z[j]), 1e-12);
        const zj = z[j]; z[j] = zj + h; f(z, F1); z[j] = zj;
        for (let i = 0; i < n; i++) J[i][j] = (i === j ? 1 : 0) - dt * (F1[i] - F0[i]) / h;
      }
      const dz = solve(J, G.map(v => -v));
      let big = 0;
      for (let i = 0; i < n; i++) {
        z[i] += dz[i];
        if (i !== 3) big = Math.max(big, Math.abs(dz[i]) / (Math.abs(z[i]) + 1e-12));
      }
      if (big < 1e-9) break;
    }
    for (let i = 0; i < n; i++) if (z[i] < 0) z[i] = 0;
    return z;
  }

  // Time grid: geometric from 1e-4 s, then capped steps
  function grid(tEnd, dtMax) {
    const t = [0];
    let dt = 1e-4;
    while (t[t.length - 1] < tEnd) { t.push(Math.min(t[t.length - 1] + dt, tEnd)); dt = Math.min(dt * 1.15, dtMax); }
    return t;
  }

  function integrate(y0, p, pH, tEnd, dtMax = 5) {
    const c = consts(p, pH), f = (y, o) => rates(y, p, c, o);
    const T = grid(tEnd, dtMax), Y = [pad(y0)];
    let y = pad(y0);
    for (let i = 1; i < T.length; i++) { y = beStep(y, T[i] - T[i - 1], f); Y.push(y); }
    return { T, Y };
  }
  const pad = y => y.length >= NS ? y.slice() : y.concat(new Array(NS - y.length).fill(0));

  // After bisulfite: chlorine gone; NCL -> cipro (k_rev) or -> P1 (k_frag)
  function bisulfite(y, p, pH, minutes) {
    const kf = consts(p, pH).kf, kr = p.k_rev_bisulfite, k = kf + kr, t = minutes * 60;
    const left = y[5] * Math.exp(-k * t), gone = y[5] - left;
    const toCip = k > 0 ? gone * kr / k : 0;
    const out = y.slice();
    out[0] = 0; out[2] = 0; out[8] = 0; out[4] = y[4] + toCip; out[5] = left; out[6] = y[6] + gone - toCip;
    return out;
  }

  function initial(s) {
    const Cl = s.Cl_mgL / 1000 / MW_CL2, N = s.NH3_mgN_L / 1000 / MW_N, C = s.cipro_mgL / 1000 / MW_CIP;
    if (s.mode === 'preformed') return [Math.max(Cl - N, 0), Math.max(N - Cl, 0), Math.min(Cl, N), 0, C, 0, 0, 0, 0];
    if (s.mode === 'together') return [Cl, N, 0, 0, C, 0, 0, 0, 0];
    return [Cl, 0, 0, 0, C, 0, 0, 0, 0];
  }

  function summary(yEnd, yOut, C0) {
    const ug = v => Math.max(v, 0) * MW_CIP * 1e6;
    return {
      FC_end: yEnd[0] * MW_CL2 * 1000, CC_end: (yEnd[2] + 2 * yEnd[8]) * MW_CL2 * 1000,
      DCA_end: 2 * yEnd[8] * MW_CL2 * 1000, CT: yEnd[3],
      cipro_end: ug(yEnd[4]), NCL_end: ug(yEnd[5]), thio: ug(yEnd[4] + yEnd[5]),
      cipro_out: ug(yOut[4]), NCL_out: ug(yOut[5]), P1_out: ug(yOut[6]), P2_out: ug(yOut[7]),
      drugOnly: 100 * (1 - Math.max(yOut[4], 0) / C0),
      core: 100 * (yOut[4] + yOut[5] + yOut[6] + yOut[7]) / C0,
      returned: 100 * Math.max(yOut[4] - yEnd[4], 0) / C0,
    };
  }

  function runBatch(s, p) {
    const y0 = initial(s), tr = integrate(y0, p, s.pH, s.contact_min * 60);
    const yEnd = tr.Y[tr.Y.length - 1], yOut = bisulfite(yEnd, p, s.pH, s.after_min);
    return { tr, res: summary(yEnd, yOut, y0[4]) };
  }

  // Steady state through N tanks in series: pseudo-time implicit Euler per tank
  function runFlow(s, p, N) {
    const c = consts(p, s.pH), y0 = initial(s), th = s.contact_min * 60 / N;
    let yin = y0.slice();
    for (let k = 0; k < N; k++) {
      const yf = yin.slice(), R = new Array(NS);
      const f = (y, o) => { rates(y, p, c, R); for (let i = 0; i < NS; i++) o[i] = (yf[i] - y[i]) / th + R[i]; };
      let y = yf.slice(), dt = 1e-4;
      for (let it = 0; it < 120 && dt < 1e4 * th; it++) { y = beStep(y, dt, f); dt *= 1.35; }
      yin = y;
    }
    return summary(yin, bisulfite(yin, p, s.pH, s.after_min), y0[4]);
  }

  // ---- tube size + pump flow -> flow pattern (port of ris/flow_reactor.tube_hydraulics, added 10-15)
  function tube(idMm, lengthM, flowMlMin, coilMm = 100, Dm = D_CIPRO) {
    const R = idMm / 2000, area = Math.PI * R * R, Q = flowMlMin * 1e-6 / 60, u = Q / area;
    const tau = lengthM / u, Re = u * 2 * R / NU_WATER, theta = Dm * tau / (R * R);
    const De = coilMm ? Re * Math.sqrt(2 * R / (coilMm / 1000)) : null;
    let regime, D = null;
    if (Re > 2100) { regime = 'turbulent'; D = u * 2 * R * (3e7 / Math.pow(Re, 2.1) + 1.35 / Math.pow(Re, 0.125)); }
    else if (theta >= 0.8) { regime = 'laminar, Taylor dispersion'; D = Dm + u * u * R * R / (48 * Dm); }
    else regime = 'laminar, convection-dominated';
    let N = null;
    if (D !== null) { const Pe = u * lengthM / D; N = 1 / (2 / Pe - 2 / (Pe * Pe) * (1 - Math.exp(-Pe))); }
    return { u, tau, tau_min: tau / 60, Re, theta, De, regime, N, volume_mL: area * lengthM * 1e6 };
  }
  const flowForContact = (idMm, lengthM, contactMin) => Math.PI * Math.pow(idMm / 2000, 2) * lengthM * 1e6 / contactMin;

  // Laminar convection, segregated flow: equal-flow slices leave at their exact mean exit time
  function runLaminar(s, p, n = 160) {
    const tau = s.contact_min * 60, y0 = initial(s);
    const tx = []; for (let i = 0; i < n; i++) tx.push(Math.max(tau / 2, tau * (Math.sqrt(1 - i / n) - Math.sqrt(1 - (i + 1) / n)) * n));
    const tr = integrate(y0, p, s.pH, Math.max(...tx), Math.max(5, tau / 60));
    const T = tr.T, Y = tr.Y, mean = new Array(NS).fill(0);
    let j = 1;
    tx.slice().sort((a, b) => a - b).forEach(t => {
      while (j < T.length - 1 && T[j] < t) j++;
      const f = (t - T[j - 1]) / (T[j] - T[j - 1]);
      for (let i = 0; i < NS; i++) mean[i] += (Y[j - 1][i] + f * (Y[j][i] - Y[j - 1][i])) / n;
    });
    return summary(mean, bisulfite(mean, p, s.pH, s.after_min), y0[4]);
  }

  // One call from the real tube: predicted flow pattern -> outlet. Returns {res, h}
  function runTube(s, p, idMm, lengthM, coilMm = 100) {
    const flow = flowForContact(idMm, lengthM, s.contact_min), h = tube(idMm, lengthM, flow, coilMm);
    const res = h.N === null ? runLaminar(s, p) : runFlow(s, p, Math.max(1, Math.min(200, Math.round(h.N))));
    return { res, h, flow };
  }

  // Dodd 2005 Fig 5a: thiosulfate-measured (cipro + N-chloro-cipro)/C0 in real waters
  function doddCurve(p, pH, FAC, tMin) {
    const tr = integrate([FAC, 0, 0, 0, 1.5e-6, 0, 0, 0, 0], p, pH, tMin * 60, 10);
    return tr.T.map((t, i) => [t / 60, (tr.Y[i][4] + tr.Y[i][5]) / 1.5e-6]);
  }

  return { DEFAULTS, consts, runBatch, runFlow, runLaminar, runTube, tube, flowForContact, bisulfite, doddCurve, integrate, MW_CL2, MW_CIP };
})();
if (typeof module !== 'undefined') module.exports = RIS;
