// Runs inside headless Chromium: loads one .glb and renders it from the game's isometric camera at eight
// turns, with a dark ink outline round the silhouette. tools/bake.mjs drives it.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export interface BakeOptions {
  /** Supersampling: frames are stored at this multiple of game pixels. */
  scale: number;
  /** Tiles per metre, before the fit clamps it. */
  tilesPerMetre: number;
  /** The widest the model may be, in tiles. */
  fit: number;
  /** 'floor': stands on the tile's centre. 'wall': its back sits on the wall plane, its middle `height` px up. */
  mount: 'floor' | 'wall';
  height: number;
  /** Extra turn (degrees) so the model's front faces grid +y at frame 0. */
  yaw: number;
  /** Ink outline width, in game pixels. */
  outline: number;
}

export interface Baked {
  strip: string; // a webp data URL: eight frames side by side, frame k is the view turned k × 45°
  w: number;
  h: number;
  ax: number; // the anchor (tile centre on the floor, or the wall point) inside each frame, in stored pixels
  ay: number;
  tiles: { w: number; d: number; h: number }; // the model's size in tiles (h in game px)
}

const ELEV = Math.PI / 6; // 2:1 isometric
const PPU = 48 * Math.SQRT2; // game pixels per tile along a grid axis
const ZPX = PPU * Math.cos(ELEV); // game pixels per tile of height

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setClearColor(0x000000, 0);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene();
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.35;
// Night: a cool fill from everywhere, and a warm key from the top left of the screen.
scene.add(new THREE.HemisphereLight(0x9fb0e0, 0x2a2430, 1.1));
const key = new THREE.DirectionalLight(0xffe7c4, 2.6);
key.position.set(-0.6, 2, 1.4);
scene.add(key);
const rim = new THREE.DirectionalLight(0x8fa8ff, 0.8);
rim.position.set(1.5, 1, -1.5);
scene.add(rim);

const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);

(window as unknown as { bake: typeof bake }).bake = bake;

async function bake(url: string, o: BakeOptions): Promise<Baked> {
  const gltf = await loader.loadAsync(url);
  const model = gltf.scene;
  // Size it: real size at tilesPerMetre, shrunk to fit.
  let box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  let k = o.tilesPerMetre;
  const wide = Math.max(size.x, size.z) * k;
  if (wide > o.fit) k *= o.fit / wide;
  model.scale.multiplyScalar(k);
  model.rotation.y = (o.yaw * Math.PI) / 180;
  model.updateMatrixWorld(true);
  box = new THREE.Box3().setFromObject(model);
  const c = box.getCenter(new THREE.Vector3());
  // Floor props stand centred on the origin; wall props hang with their back on the plane z = 0 (grid y = 0).
  model.position.set(-c.x, o.mount === 'wall' ? -c.y + o.height / ZPX : -box.min.y, o.mount === 'wall' ? -box.min.z : -c.z);
  const pivot = new THREE.Group();
  pivot.add(model);
  scene.add(pivot);
  pivot.updateMatrixWorld(true);
  const s = box.getSize(new THREE.Vector3());

  // One frame size for all eight turns, with the anchor in the same place.
  const ppu = PPU * o.scale;
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, -100, 100);
  cam.position.set(Math.cos(ELEV) / Math.SQRT2, Math.sin(ELEV), Math.cos(ELEV) / Math.SQRT2);
  cam.lookAt(0, 0, 0);
  cam.updateMatrixWorld(true);
  const right = new THREE.Vector3(1, 0, -1).normalize();
  const up = new THREE.Vector3().crossVectors(right, cam.position.clone().normalize()).negate();
  const pts: THREE.Vector3[] = [];
  const corners = new THREE.Box3().setFromObject(pivot);
  for (const x of [corners.min.x, corners.max.x]) for (const y of [corners.min.y, corners.max.y]) for (const z of [corners.min.z, corners.max.z]) pts.push(new THREE.Vector3(x, y, z));
  let l = 0, r = 0, t = 0, b = 0;
  for (let i = 0; i < 8; i++) {
    const m = new THREE.Matrix4().makeRotationY(-(i * Math.PI) / 4);
    for (const p of pts) {
      const q = p.clone().applyMatrix4(m);
      const sx = q.dot(right), sy = q.dot(up);
      l = Math.min(l, sx); r = Math.max(r, sx); b = Math.min(b, sy); t = Math.max(t, sy);
    }
  }
  const pad = (o.outline + 2) / PPU;
  l -= pad; r += pad; t += pad; b -= pad;
  const w = Math.ceil((r - l) * ppu), h = Math.ceil((t - b) * ppu);
  cam.left = l; cam.right = l + w / ppu; cam.top = t; cam.bottom = t - h / ppu;
  cam.updateProjectionMatrix();
  renderer.setSize(w, h, false);

  const strip = document.createElement('canvas');
  strip.width = w * 8;
  strip.height = h;
  const sctx = strip.getContext('2d')!;
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const ctx = out.getContext('2d')!;
  const ink = document.createElement('canvas');
  ink.width = w;
  ink.height = h;
  const ictx = ink.getContext('2d')!;
  const ow = o.outline * o.scale;
  for (let i = 0; i < 8; i++) {
    pivot.rotation.y = -(i * Math.PI) / 4; // the game's turn by i × 45°
    renderer.render(scene, cam);
    // The ink: the silhouette, filled dark and smeared outward in a ring, under the picture.
    ictx.clearRect(0, 0, w, h);
    ictx.globalCompositeOperation = 'source-over';
    ictx.drawImage(renderer.domElement, 0, 0);
    ictx.globalCompositeOperation = 'source-in';
    ictx.fillStyle = '#15121c';
    ictx.fillRect(0, 0, w, h);
    ctx.clearRect(0, 0, w, h);
    for (let a = 0; a < 16; a++) ctx.drawImage(ink, Math.cos((a * Math.PI) / 8) * ow, Math.sin((a * Math.PI) / 8) * ow);
    ctx.drawImage(renderer.domElement, 0, 0);
    sctx.drawImage(out, i * w, 0);
  }
  scene.remove(pivot);
  return { strip: strip.toDataURL('image/webp', 0.82), w, h, ax: -l * ppu, ay: t * ppu, tiles: { w: s.x, d: s.z, h: s.y * ZPX } };
}
