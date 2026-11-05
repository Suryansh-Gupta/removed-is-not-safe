// The bench reactor from the project's spec: two jugs, two peristaltic pumps, Raspberry Pi, static
// mixer, PTFE coil on a 4" PVC former with ports A/B/C, sample vials and a waste jug. Units: dm.
import * as THREE from 'three';
import * as G from '../lib/gl.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const std = (color, o = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: .45, metalness: 0, clearcoat: .3, ...o });
const glass = (color, opacity = .25) => new THREE.MeshPhysicalMaterial({ color, roughness: .08, transparent: true, opacity, depthWrite: false, clearcoat: 1 });
function rbox(w, h, d, mat) { const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, Math.min(.09, Math.min(w, h, d) * .32)), mat); m.castShadow = true; m.receiveShadow = true; return m; }
function cyl(r, h, mat, seg = 48, rTop = r) { const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, r, h, seg), mat); m.castShadow = true; return m; }
function tube(points, r, mat) { const c = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))); return new THREE.Mesh(new THREE.TubeGeometry(c, 120, r, 12), mat); }

function jug(r, h, liquid, level) {
  const g = new THREE.Group();
  const shell = cyl(r, h, glass(0xffffff, .18)); shell.position.y = h / 2; g.add(shell);
  const water = cyl(r * .94, h * level, new THREE.MeshPhysicalMaterial({ color: liquid, roughness: .2, transparent: true, opacity: .72 })); water.position.y = h * level / 2 + .02; g.add(water);
  const neck = cyl(r * .42, h * .08, glass(0xffffff, .3)); neck.position.y = h + h * .04; g.add(neck);
  const cap = cyl(r * .46, h * .08, std(0x10163a)); cap.position.y = h + h * .12; g.add(cap);
  return g;
}
function pump() {
  const g = new THREE.Group();
  const body = rbox(1.5, 1.5, 1.05, std(0x171d3f, { roughness: .35 })); body.position.y = .75; g.add(body);
  const plate = cyl(.58, .08, std(0xf4f6fb)); plate.rotation.x = Math.PI / 2; plate.position.set(0, .8, .56); g.add(plate);
  const rotor = new THREE.Group(); rotor.position.set(0, .8, .62); g.add(rotor);
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, r = cyl(.07, .1, std(0x9aa4c8, { metalness: .6, roughness: .3 }), 16); r.rotation.x = Math.PI / 2; r.position.set(Math.cos(a) * .4, Math.sin(a) * .4, .02); rotor.add(r); }
  const hub = cyl(.11, .12, std(0x3b4fe0)); hub.rotation.x = Math.PI / 2; rotor.add(hub);
  g.userData.rotor = rotor; return g;
}

export function reactorSet() {
  const scene = new THREE.Scene(), camera = G.camera(30);
  G.keyLights(scene, { key: 2.4, rim: 1.4, fill: 1.0, keyPos: [-6, 12, 9], rimPos: [8, 6, -8] });
  const sun = new THREE.DirectionalLight(0xffffff, 1.3); sun.position.set(-5, 14, 8); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 12, bottom: -12, far: 40 }); sun.shadow.radius = 8; scene.add(sun);
  const table = rbox(19, .35, 9.4, std(0xf7f8fc, { roughness: .6 })); table.position.y = -.175; table.receiveShadow = true; scene.add(table);

  const parts = {};
  const add = (name, build, dir) => { const g = new THREE.Group(); build(g); scene.add(g); parts[name] = { g, dir }; return g; };
  add('jugs', (g) => {
    const feed = jug(1.25, 3.6, 0x9fc4f5, .7); feed.position.set(-7.2, 0, -1.5); g.add(feed);
    const cl = jug(.85, 2.4, 0xe8ef86, .68); cl.position.set(-8.3, 0, 1.5); g.add(cl);
  }, [-1.5, 1.8, -.6]);
  const pA = pump(), pB = pump();
  add('pumps', (g) => { pA.position.set(-4.6, 0, -1.4); pB.position.set(-5, 0, 1.6); g.add(pA, pB); }, [-.4, 3.3, 1]);
  add('pi', (g) => {
    const b = rbox(1.25, .1, .85, std(0x37a55e)); b.position.set(-5.6, .12, 3.6); g.add(b);
    const chip = rbox(.36, .08, .36, std(0x161a2c)); chip.position.set(-5.8, .21, 3.6); g.add(chip);
    for (let i = 0; i < 3; i++) { const s = rbox(.24, .16, .2, std(0xcfd4e0, { metalness: .7 })); s.position.set(-5.25, .24, 3.3 + i * .3); g.add(s); }
  }, [-.2, 1.6, 2.2]);
  add('mixer', (g) => {
    const m = cyl(.17, 1.3, std(0xc8cfe0, { metalness: .85, roughness: .25 }), 24); m.rotation.z = Math.PI / 2; m.position.set(-1.7, .55, .1); g.add(m);
    const lines = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .2, transparent: true, opacity: .75 });
    g.add(tube([[-3.85, .8, -1.4], [-3, .6, -.3], [-2.35, .55, .1]], .075, lines)); g.add(tube([[-4.25, .8, 1.6], [-3, .6, .6], [-2.35, .55, .1]], .075, lines));
  }, [0, 2.4, 2.4]);

  // coil: 3.8 m wrapped ~10 turns on the former, drawn to the project's proportions (~6.4 cm tall in reality; scaled for legibility)
  const cx = 2.3, cz = 0, R = 1.72, H0 = .35, H1 = 3.15, turns = 10;
  const coilPt = (k) => { const a = k * turns * Math.PI * 2; return new THREE.Vector3(cx + Math.cos(a) * R, H0 + (H1 - H0) * k, cz + Math.sin(a) * R); };
  const coilGroup = add('coil', (g) => {
    const former = cyl(1.55, 3.45, std(0xf4f5f8, { roughness: .55 })); former.position.set(cx, 1.72, cz); g.add(former);
    const inner = cyl(1.33, .02, std(0x7f88a3)); inner.position.set(cx, 3.46, cz); g.add(inner);
    const pts = []; for (let i = 0; i <= 360; i++) pts.push(coilPt(i / 360));
    const curve = new THREE.CatmullRomCurve3(pts); g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 900, .12, 14), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .12, transparent: true, opacity: .42, depthWrite: false })));
  }, [0, 2.2, -.8]);
  // flow: beads travelling the coil, instanced; colour follows contact time from the model
  const BEADS = 620, beadMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(.058, 10, 8), new THREE.MeshStandardMaterial({ roughness: .3 }), BEADS);
  beadMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(BEADS * 3), 3); coilGroup.add(beadMesh);
  const portK = [.25, .5, .75], portMeshes = [];
  add('ports', (g) => {
    portK.forEach((k) => { const p = coilPt(k); const stem = rbox(.34, .34, .34, std(0x3b4fe0)); stem.position.copy(p).add(new THREE.Vector3(.14, 0, .14)); g.add(stem);
      const v = cyl(.1, .46, std(0x2336b8)); v.position.copy(stem.position).add(new THREE.Vector3(0, .34, 0)); g.add(v); portMeshes.push(stem); });
  }, [2.4, 1.4, 2.2]);
  add('vials', (g) => {
    const rack = rbox(2.5, .16, .9, std(0xf0f2f8)); rack.position.set(5.9, .1, 2.2); g.add(rack);
    for (let i = 0; i < 3; i++) { const vx = 5.1 + i * .8; const v = cyl(.27, .95, new THREE.MeshPhysicalMaterial({ color: 0xe2a13a, roughness: .2, transparent: true, opacity: .85 })); v.position.set(vx, .66, 2.2); g.add(v);
      const c = cyl(.28, .22, std(0x10163a)); c.position.set(vx, 1.24, 2.2); g.add(c); }
    const wj = jug(.95, 2.4, 0xd7dbe6, .4); wj.position.set(7.1, 0, -1.6); g.add(wj);
  }, [2.1, 1.7, 1.2]);
  const lineMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: .25, transparent: true, opacity: .8 });
  const plumbing = new THREE.Group(); scene.add(plumbing);
  plumbing.add(tube([[-7.2, 2.9, -1.5], [-7.2, 3.9, -1.5], [-5.7, 2.2, -1.2], [-4.6, 1.35, -1.4], [-4.6, 1.5, -1.4]], .07, lineMat));
  plumbing.add(tube([[-8.3, 2.5, 1.5], [-8.3, 3.05, 1.5], [-6.5, 1.8, 2], [-5, 1.35, 1.6], [-5, 1.5, 1.6]], .07, lineMat));
  plumbing.add(tube([[-1.05, .55, .1], [-.2, .4, .9], [.8, .32, 1.2], [coilPt(0).x, coilPt(0).y, coilPt(0).z]], .08, lineMat));
  plumbing.add(tube([[coilPt(1).x, coilPt(1).y, coilPt(1).z], [4.8, 3.7, .6], [6.5, 3.2, -.6], [7.1, 2.6, -1.6]], .08, lineMat));

  const baseQ = new Map();
  const C = { cip: new THREE.Color('#7f93ff'), ncl: new THREE.Color('#ff5f9e'), prod: new THREE.Color('#ffb340'), off: new THREE.Color('#ffffff') };
  const M4 = new THREE.Matrix4(), tmp = new THREE.Color();
  const v = new THREE.Vector3();
  const set = {
    scene, camera, bloom: 0,
    anchors: {},
    update(t, u, o = {}) {
      const ex = o.explode || 0;
      for (const k in parts) { const { g, dir } = parts[k]; g.position.set(dir[0] * ex, dir[1] * ex, dir[2] * ex); }
      plumbing.traverse((m) => { if (m.material) { m.material.opacity = .8 * (1 - Math.min(1, ex * 1.6)); } });
      plumbing.visible = ex < .6;
      const spin = t * (o.spin ?? 1.5); pA.userData.rotor.rotation.z = -spin; pB.userData.rotor.rotation.z = -spin * .9;
      const fl = o.flow ?? 0;
      for (let i = 0; i < BEADS; i++) {
        const k0 = i / BEADS; const k = (k0 + (t * .012)) % 1;
        const vis = fl > 0 && k <= fl;
        const p = coilPt(k); M4.makeScale(vis ? 1 : 0, vis ? 1 : 0, vis ? 1 : 0); M4.setPosition(p.x, p.y, p.z); beadMesh.setMatrixAt(i, M4);
        const f = o.frac ? o.frac(k * 30) : { ncl: 1, prod: 0 }; const h = (i * 2654435761 % 1000) / 1000;
        tmp.copy(h < f.prod ? C.prod : C.ncl); beadMesh.setColorAt(i, tmp);
      }
      beadMesh.instanceMatrix.needsUpdate = true; beadMesh.instanceColor.needsUpdate = true;
      G.lookFrom(camera, o.cam || [0, 7, 22], o.target || [0, 1.5, 0]);
      camera.updateMatrixWorld(); camera.updateProjectionMatrix();
    },
    // screen position of a world point, moved by a part's current explode offset
    project(p, part, ex, W, H) {
      const d = part ? parts[part].dir : [0, 0, 0];
      v.set(p[0] + d[0] * ex, p[1] + d[1] * ex, p[2] + d[2] * ex).project(camera);
      return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H];
    },
    coilPort: (i) => { const p = coilPt(portK[i]); return [p.x, p.y, p.z]; },
  };
  return set;
}
