// The 9:16 presentation: the 16:9 film playing on a monitor on a desk, lit by its own screen. Original set.
import * as THREE from 'three';
import * as G from '../lib/gl.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export function deskSet(screenCanvas) {
  const scene = new THREE.Scene(), camera = G.camera(34);
  scene.background = new THREE.Color(0x070504);
  scene.environment = G.ENV; scene.environmentIntensity = .05;
  const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: .6, ...o });

  // slatted wall
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(14, 10), mat(0x0c0806)); wall.position.set(0, 2.2, -.55); scene.add(wall);
  const slatGeo = new THREE.BoxGeometry(.13, 10, .22), slats = new THREE.InstancedMesh(slatGeo, mat(0x8a5a32, { roughness: .62 }), 44), d = new THREE.Object3D();
  for (let i = 0; i < 44; i++) { d.position.set(-5.5 + i * .25, 2.2, -.42); d.updateMatrix(); slats.setMatrixAt(i, d.matrix); }
  scene.add(slats);
  // desk
  const desk = new THREE.Mesh(new THREE.PlaneGeometry(14, 8), mat(0x241812, { roughness: .52, metalness: .05 })); desk.rotation.x = -Math.PI / 2; desk.position.set(0, -.28, 3); scene.add(desk);
  // monitor
  const SW = 3.46, SH = SW * 9 / 16, MY = 1.42;
  const body = new THREE.Mesh(new RoundedBoxGeometry(SW + .08, SH + .08, .1, 3, .03), mat(0x090909, { roughness: .4 })); body.position.set(0, MY, 0); scene.add(body);
  const tex = new THREE.CanvasTexture(screenCanvas); tex.colorSpace = THREE.SRGBColorSpace; tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false; tex.anisotropy = 8;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })); screen.position.set(0, MY, .055); scene.add(screen);
  const stem = new THREE.Mesh(new THREE.BoxGeometry(.5, .5, .1), mat(0x101010)); stem.position.set(0, .02, -.1); scene.add(stem);
  const foot = new THREE.Mesh(new RoundedBoxGeometry(1.2, .04, .6, 3, .015), mat(0x151515, { roughness: .3 })); foot.position.set(0, -.26, .1); scene.add(foot);
  // light bar on top of the monitor
  const bar = new THREE.Mesh(new RoundedBoxGeometry(2.7, .05, .1, 3, .02), mat(0x0a0a0a)); bar.position.set(0, MY + SH / 2 + .13, .06); scene.add(bar);
  const washL = new THREE.SpotLight(0xffc48a, 26, 7, 1.15, .9, 1.4); washL.position.set(-.4, MY + SH / 2 + 1.5, 1.1); washL.target.position.set(-.3, MY + SH / 2 + 2.6, -.4); scene.add(washL, washL.target);
  const washB = new THREE.SpotLight(0xffc48a, 9, 7, 1.2, .9, 1.4); washB.position.set(.2, 2.6, 2.4); washB.target.position.set(0, -.4, -.4); scene.add(washB, washB.target);
  // keyboard
  const kb = new THREE.Group(); kb.position.set(.15, -.26, 3.9); kb.scale.setScalar(1.45); kb.rotation.y = -.05; scene.add(kb);
  const wood = new THREE.Mesh(new RoundedBoxGeometry(2.05, .1, .78, 3, .025), mat(0x6e2f1c, { roughness: .4 })); wood.position.y = .05; wood.rotation.x = .05; kb.add(wood);
  const keyGeo = new RoundedBoxGeometry(.112, .05, .112, 2, .018), keys = new THREE.InstancedMesh(keyGeo, mat(0x171a22, { roughness: .35, metalness: .1 }), 75);
  let n = 0;
  for (let r = 0; r < 5; r++) for (let c = 0; c < 15; c++) { d.position.set(-.88 + c * .126, .125 + (r - 2) * -.006, -.26 + r * .13); d.updateMatrix(); keys.setMatrixAt(n++, d.matrix); }
  kb.add(keys);
  // a small glowing lamp, cut by the frame like a real desk shot
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xff6f7c, toneMapped: false });
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(.3, 48, 32), lampMat); lamp.position.set(1.95, .05, 1.6); scene.add(lamp);
  const lampLight = new THREE.PointLight(0xff3b4e, 6, 4, 1.7); lampLight.position.set(1.8, .3, 1.9); scene.add(lampLight);
  // the screen lights the room
  const glow = new THREE.PointLight(0xffffff, 0, 8, 1.5); glow.position.set(0, MY - .25, 1.1); scene.add(glow);
  scene.add(new THREE.AmbientLight(0xffe2c8, .12));

  return {
    scene, camera,
    update(t, u, o) {
      tex.needsUpdate = true;
      const [r, g, b] = o.glow; glow.color.setRGB(r, g, b); glow.intensity = 3 + (r + g + b) * 7;
      lamp.scale.setScalar(1 + Math.sin(t * .8) * .012);
      // handheld: small and slow, with a pure function of time
      const x = Math.sin(t * .31) * .014 + Math.sin(t * .83 + 1) * .005, y = Math.sin(t * .23 + 2) * .009 + Math.sin(t * .71) * .004;
      G.lookFrom(camera, [.12 + x, 2.5 + y, 11.2], [.02 + x * .3, .1 + y * .3, 0], -.012 + Math.sin(t * .19) * .0015);
    },
  };
}
