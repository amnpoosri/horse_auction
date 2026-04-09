import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Image,
  TextInput,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Dimensions,
  useWindowDimensions,
} from 'react-native';
import * as THREE from 'three';

// Web-friendly overlay (RN Modal opens a blank page on Expo Web)
function Overlay({ visible, children }: { visible: boolean; children: React.ReactNode }) {
  if (!visible) return null;
  return (
    <View style={overlayStyles.backdrop}>
      {children}
    </View>
  );
}
const overlayStyles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
});

// Detect the API URL based on the environment.
// In Codespaces the browser reaches ports via <codespace>-<port>.app.github.dev
function getApiUrl(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const hostname = window.location.hostname; // e.g. codespace-name-8081.app.github.dev
    if (hostname.endsWith('.app.github.dev')) {
      // Replace the last port segment before .app.github.dev with 3000
      const backendHost = hostname.replace(/-\d+(?=\.app\.github\.dev$)/, '-3000');
      const url = `https://${backendHost}`;
      console.log('[Horse Auction] API URL:', url);
      return url;
    }
    // Local development
    return `${window.location.protocol}//${window.location.hostname}:3000`;
  }
  return 'http://localhost:3000';
}
const API_URL = getApiUrl();

// ─── Responsive hook ─────────────────────────────────────────────────────
function useResponsive() {
  const { width } = useWindowDimensions();
  const cols = width >= 1200 ? 3 : width >= 700 ? 2 : 1;
  const isWide = width >= 700;
  const isDesktop = width >= 1000;
  return { width, cols, isWide, isDesktop };
}

// ─── Horse color mapping ─────────────────────────────────────────────────
function getHorseColors(colorName: string): { body: number; dark: number; accent: number; hoof: number } {
  const c = (colorName || '').toLowerCase().trim();
  if (c.includes('bay'))      return { body: 0x8B4513, dark: 0x5C2E0A, accent: 0xC4956A, hoof: 0x1a1a1a };
  if (c.includes('grey') || c.includes('gray'))
                               return { body: 0xB0B0B0, dark: 0x6E6E6E, accent: 0xD8D8D8, hoof: 0x2a2a2a };
  if (c.includes('black'))    return { body: 0x2C2C2C, dark: 0x111111, accent: 0x555555, hoof: 0x0a0a0a };
  if (c.includes('gold') || c.includes('palomino'))
                               return { body: 0xDAA520, dark: 0x9B7615, accent: 0xF0D080, hoof: 0x3a2a1a };
  if (c.includes('chestnut') || c.includes('sorrel'))
                               return { body: 0xA0522D, dark: 0x6B3410, accent: 0xCD8B62, hoof: 0x1e1510 };
  if (c.includes('buckskin')) return { body: 0xC8A95E, dark: 0x8B7340, accent: 0xE0CFA0, hoof: 0x1a1a1a };
  if (c.includes('white'))    return { body: 0xF0EDE8, dark: 0xC0BBB0, accent: 0xFFFFF5, hoof: 0x4a4540 };
  if (c.includes('roan'))     return { body: 0x9E6B5A, dark: 0x6B4035, accent: 0xC89888, hoof: 0x221a15 };
  if (c.includes('pinto') || c.includes('paint'))
                               return { body: 0xC8956A, dark: 0x8B6540, accent: 0xF0E0D0, hoof: 0x1a1510 };
  if (c.includes('dun'))      return { body: 0xC4A860, dark: 0x8B7640, accent: 0xDFC888, hoof: 0x1a1a1a };
  // Default: purple theme
  return { body: 0x8b5cf6, dark: 0x4c1d95, accent: 0xc4b5fd, hoof: 0x1e1b4b };
}

// ─── Interactive 3D Horse (Three.js) ─────────────────────────────────────

// Utility: create a smooth shape by lathing a profile curve
function createLatheShape(points: [number, number][], segments = 24) {
  const pts = points.map(([x, y]) => new THREE.Vector2(x, y));
  return new THREE.LatheGeometry(pts, segments);
}

// Utility: create a smooth body section via extruding an elliptical cross-section along a path
function createSmoothMesh(
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  pos: [number, number, number],
  rot?: [number, number, number],
  scale?: [number, number, number],
) {
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(...pos);
  if (rot) mesh.rotation.set(...rot);
  if (scale) mesh.scale.set(...scale);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function build3DHorse(scene: THREE.Scene, horseColor: string) {
  const palette = getHorseColors(horseColor);

  // Materials — physically-based with subtle variation
  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: palette.body, roughness: 0.55, metalness: 0.05,
    clearcoat: 0.15, clearcoatRoughness: 0.4,  // subtle sheen like real horse coat
    sheen: 0.3, sheenColor: new THREE.Color(palette.accent),
  } as any);
  const darkMat = new THREE.MeshPhysicalMaterial({
    color: palette.dark, roughness: 0.65, metalness: 0.05,
    clearcoat: 0.1, clearcoatRoughness: 0.5,
  });
  const accentMat = new THREE.MeshPhysicalMaterial({
    color: palette.accent, roughness: 0.45, metalness: 0.08,
    clearcoat: 0.2, clearcoatRoughness: 0.3,
  });
  const eyeMat = new THREE.MeshPhysicalMaterial({
    color: 0x1a1008, roughness: 0.05, metalness: 0.1,
    clearcoat: 1.0, clearcoatRoughness: 0.05, // glossy eye
  });
  const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf5f0e8, roughness: 0.3, metalness: 0.0 });
  const hoofMat = new THREE.MeshPhysicalMaterial({
    color: palette.hoof, roughness: 0.7, metalness: 0.05,
    clearcoat: 0.3, clearcoatRoughness: 0.2,
  });
  const noseMat = new THREE.MeshPhysicalMaterial({
    color: 0x3a2520, roughness: 0.8, metalness: 0.0,
  });

  const group = new THREE.Group();
  const seg = 24; // geometry smoothness

  // ── Torso (barrel) ─ using a stretched sphere with slight tapering
  const torsoGeo = new THREE.SphereGeometry(1, seg, seg);
  const torso = createSmoothMesh(torsoGeo, bodyMat, [0, 0.35, 0], undefined, [0.65, 0.48, 0.42]);
  group.add(torso);

  // Chest bump
  const chestGeo = new THREE.SphereGeometry(0.35, seg, seg);
  const chest = createSmoothMesh(chestGeo, bodyMat, [-0.45, 0.35, 0], undefined, [0.7, 0.9, 1.0]);
  group.add(chest);

  // Hip bump
  const hipGeo = new THREE.SphereGeometry(0.32, seg, seg);
  const hip = createSmoothMesh(hipGeo, bodyMat, [0.45, 0.4, 0], undefined, [0.65, 0.85, 0.95]);
  group.add(hip);

  // ── Neck ─ built from overlapping spheres along a curve for smooth tapering
  const neckPath = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.48, 0.55, 0),
    new THREE.Vector3(-0.55, 0.7, 0),
    new THREE.Vector3(-0.62, 0.85, 0),
    new THREE.Vector3(-0.66, 0.98, 0),
    new THREE.Vector3(-0.68, 1.08, 0),
  ]);
  const neckSteps = 12;
  for (let i = 0; i <= neckSteps; i++) {
    const t = i / neckSteps;
    const pt = neckPath.getPointAt(t);
    const radius = 0.24 - t * 0.08; // taper from 0.24 at base to 0.16 at top
    const nSeg = new THREE.Mesh(
      new THREE.SphereGeometry(radius, seg, seg),
      bodyMat,
    );
    nSeg.position.copy(pt);
    nSeg.scale.set(0.85, 1.0, 0.9); // slightly flatten side-to-side
    nSeg.castShadow = true;
    group.add(nSeg);
  }
  // Throat groove — subtle indent on underside of neck
  const throatPath = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.46, 0.5, 0),
    new THREE.Vector3(-0.54, 0.65, 0),
    new THREE.Vector3(-0.6, 0.8, 0),
    new THREE.Vector3(-0.65, 0.92, 0),
  ]);
  const throatGeo = new THREE.TubeGeometry(throatPath, 10, 0.06, 8, false);
  const throat = new THREE.Mesh(throatGeo, darkMat);
  throat.castShadow = true;
  group.add(throat);

  // ── Head ─ elongated shape
  const headGeo = new THREE.SphereGeometry(0.18, seg, seg);
  const head = createSmoothMesh(headGeo, bodyMat, [-0.82, 1.2, 0], [0, 0, 0.2], [1.3, 1.0, 0.85]);
  group.add(head);

  // Jaw / lower head
  const jawGeo = new THREE.SphereGeometry(0.14, seg, seg);
  const jaw = createSmoothMesh(jawGeo, bodyMat, [-0.94, 1.1, 0], [0, 0, 0.3], [1.4, 0.7, 0.75]);
  group.add(jaw);

  // ── Muzzle
  const muzzleGeo = new THREE.SphereGeometry(0.12, seg, seg);
  const muzzle = createSmoothMesh(muzzleGeo, accentMat, [-1.12, 1.06, 0], [0, 0, 0.1], [1.1, 0.75, 0.85]);
  group.add(muzzle);

  // Nostrils
  [-0.055, 0.055].forEach((z) => {
    const nGeo = new THREE.SphereGeometry(0.025, 12, 12);
    const nostril = createSmoothMesh(nGeo, noseMat, [-1.24, 1.03, z], undefined, [1.0, 0.7, 1.0]);
    group.add(nostril);
  });

  // Mouth line — subtle dark seam
  const mouthCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.19, 1.0, -0.06),
    new THREE.Vector3(-1.24, 0.99, 0),
    new THREE.Vector3(-1.19, 1.0, 0.06),
  ]);
  const mouthGeo = new THREE.TubeGeometry(mouthCurve, 8, 0.008, 6, false);
  group.add(createSmoothMesh(mouthGeo, darkMat, [0, 0, 0]));

  // ── Eyes — anatomical: white, iris, pupil, highlight
  [-0.14, 0.14].forEach((z) => {
    const side = z > 0 ? 1 : -1;
    // Eye socket indent
    const socketGeo = new THREE.SphereGeometry(0.06, 12, 12);
    group.add(createSmoothMesh(socketGeo, darkMat, [-0.86, 1.26, z * 1.05], undefined, [0.6, 0.8, 0.6]));
    // Eye white
    const whiteGeo = new THREE.SphereGeometry(0.045, 12, 12);
    group.add(createSmoothMesh(whiteGeo, eyeWhiteMat, [-0.87, 1.26, z * 1.08], undefined, [0.5, 0.7, 0.55]));
    // Iris
    const irisGeo = new THREE.SphereGeometry(0.03, 12, 12);
    group.add(createSmoothMesh(irisGeo, new THREE.MeshPhysicalMaterial({
      color: 0x4a3520, roughness: 0.1, metalness: 0.0, clearcoat: 1.0,
    }), [-0.88, 1.26, z * 1.1], undefined, [0.5, 0.65, 0.5]));
    // Pupil
    const pupilGeo = new THREE.SphereGeometry(0.016, 10, 10);
    group.add(createSmoothMesh(pupilGeo, eyeMat, [-0.885, 1.26, z * 1.12]));
    // Specular highlight
    const hlGeo = new THREE.SphereGeometry(0.008, 8, 8);
    const hlMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    group.add(createSmoothMesh(hlGeo, hlMat, [-0.89, 1.28, z * 1.11 + side * 0.01]));
  });

  // ── Ears — tapered cones with inner pink
  [-0.1, 0.1].forEach((z) => {
    const earGeo = new THREE.ConeGeometry(0.045, 0.18, 8);
    const ear = createSmoothMesh(earGeo, bodyMat, [-0.74, 1.43, z], [z > 0 ? -0.25 : 0.25, 0, 0.35]);
    group.add(ear);
    // Inner ear
    const innerGeo = new THREE.ConeGeometry(0.025, 0.12, 8);
    const innerMat = new THREE.MeshStandardMaterial({ color: 0xd4a0a0, roughness: 0.6 });
    const inner = createSmoothMesh(innerGeo, innerMat, [-0.73, 1.42, z * 1.05], [z > 0 ? -0.25 : 0.25, 0, 0.35]);
    group.add(inner);
  });

  // ── Mane — flowing strands along the neck
  const maneMat = new THREE.MeshPhysicalMaterial({
    color: palette.dark, roughness: 0.7, metalness: 0.0,
    clearcoat: 0.1,
  });
  for (let i = 0; i < 14; i++) {
    const t = i / 13;
    // Position along the neck curve
    const px = -0.52 - t * 0.22;
    const py = 0.65 + t * 0.52;
    const fallLength = 0.12 + (1 - t) * 0.15;
    const strandCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(px, py, 0),
      new THREE.Vector3(px + 0.02, py - fallLength * 0.3, 0.06 + t * 0.04),
      new THREE.Vector3(px + 0.04, py - fallLength * 0.7, 0.1 + t * 0.06),
      new THREE.Vector3(px + 0.02 + t * 0.03, py - fallLength, 0.12 + t * 0.05),
    ]);
    const strandGeo = new THREE.TubeGeometry(strandCurve, 8, 0.012 + Math.random() * 0.008, 6, false);
    const strand = new THREE.Mesh(strandGeo, maneMat);
    strand.castShadow = true;
    group.add(strand);
  }
  // Forelock (between ears)
  for (let i = 0; i < 5; i++) {
    const offset = (i - 2) * 0.015;
    const forelockCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.76, 1.36, offset),
      new THREE.Vector3(-0.82, 1.28, offset + 0.02),
      new THREE.Vector3(-0.86, 1.2, offset),
    ]);
    const fGeo = new THREE.TubeGeometry(forelockCurve, 6, 0.01, 5, false);
    group.add(new THREE.Mesh(fGeo, maneMat));
  }

  // ── Legs — anatomically segmented: shoulder/hip, upper, knee, cannon, fetlock, hoof
  const legConfigs = [
    { x: -0.35, z: 0.18, front: true },  // front left
    { x: -0.35, z: -0.18, front: true },  // front right
    { x: 0.38, z: 0.18, front: false },   // rear left
    { x: 0.38, z: -0.18, front: false },  // rear right
  ];
  legConfigs.forEach(({ x, z, front }) => {
    const topY = front ? 0.2 : 0.25;
    // Shoulder / hip joint
    const jointGeo = new THREE.SphereGeometry(0.1, seg, 12);
    group.add(createSmoothMesh(jointGeo, bodyMat, [x, topY, z], undefined, [0.9, 1.1, 0.85]));

    // Upper leg
    const upperGeo = new THREE.CylinderGeometry(0.075, 0.06, 0.35, seg);
    group.add(createSmoothMesh(upperGeo, bodyMat, [x, topY - 0.25, z]));

    // Knee
    const kneeGeo = new THREE.SphereGeometry(0.055, 12, 12);
    group.add(createSmoothMesh(kneeGeo, bodyMat, [x, topY - 0.45, z]));

    // Cannon bone (lower leg)
    const cannonGeo = new THREE.CylinderGeometry(0.045, 0.04, front ? 0.35 : 0.32, seg);
    group.add(createSmoothMesh(cannonGeo, bodyMat, [x, topY - 0.65, z]));

    // Fetlock joint
    const fetlockGeo = new THREE.SphereGeometry(0.042, 10, 10);
    group.add(createSmoothMesh(fetlockGeo, accentMat, [x, topY - 0.83, z]));

    // Pastern
    const pasternGeo = new THREE.CylinderGeometry(0.035, 0.04, 0.08, seg);
    group.add(createSmoothMesh(pasternGeo, accentMat, [x, topY - 0.89, z], [0, 0, front ? 0.1 : -0.05]));

    // Hoof — slightly flared
    const hoofGeo = new THREE.CylinderGeometry(0.04, 0.055, 0.07, seg);
    group.add(createSmoothMesh(hoofGeo, hoofMat, [x, topY - 0.96, z]));
  });

  // ── Tail — flowing, multi-strand
  const tailBase = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.6, 0.5, 0),
    new THREE.Vector3(0.75, 0.6, 0),
    new THREE.Vector3(0.85, 0.5, 0),
    new THREE.Vector3(0.9, 0.3, 0),
  ]);
  const tailBaseGeo = new THREE.TubeGeometry(tailBase, 12, 0.04, seg, false);
  group.add(new THREE.Mesh(tailBaseGeo, bodyMat));

  // Flowing tail strands
  for (let i = 0; i < 10; i++) {
    const spread = (i - 4.5) * 0.02;
    const len = 0.3 + Math.random() * 0.25;
    const sway = (Math.random() - 0.5) * 0.1;
    const tc = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.85, 0.45, spread),
      new THREE.Vector3(0.95 + sway, 0.3, spread * 1.5),
      new THREE.Vector3(1.0 + sway * 0.5, 0.15 - len * 0.3, spread * 2),
      new THREE.Vector3(0.95 + sway, 0.0 - len * 0.4, spread * 1.8),
    ]);
    const tGeo = new THREE.TubeGeometry(tc, 10, 0.008 + Math.random() * 0.008, 5, false);
    group.add(new THREE.Mesh(tGeo, maneMat));
  }

  // ── Withers ridge (top of back)
  const withersGeo = new THREE.SphereGeometry(0.12, seg, seg);
  group.add(createSmoothMesh(withersGeo, bodyMat, [-0.35, 0.65, 0], undefined, [1.5, 0.6, 0.9]));

  // ── Belly contour
  const bellyGeo = new THREE.SphereGeometry(0.25, seg, seg);
  group.add(createSmoothMesh(bellyGeo, bodyMat, [0.05, 0.05, 0], undefined, [1.8, 0.5, 0.85]));

  group.position.y = -0.25;
  group.scale.set(0.95, 0.95, 0.95);
  scene.add(group);
  return group;
}

function Horse3DPlaceholder({ height, horseColor = '' }: { height: number; horseColor?: string }) {
  const containerRef = useRef<View>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const frameRef = useRef<number>(0);
  const isDragging = useRef(false);
  const prevMouse = useRef({ x: 0, y: 0 });
  const rotation = useRef({ x: 0.2, y: 0 });
  const autoRotate = useRef(true);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const container = containerRef.current as unknown as HTMLDivElement;
    if (!container) return;

    const w = container.clientWidth || 300;
    const h = height;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);
    scene.fog = new THREE.Fog(0x0f172a, 5, 12);

    // Camera
    const camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 100);
    camera.position.set(0, 0.8, 3.8);
    camera.lookAt(0, 0.2, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);
    renderer.domElement.style.borderRadius = 'inherit';
    rendererRef.current = renderer;

    // Lights — studio 4-point setup
    const ambient = new THREE.AmbientLight(0xc8c0e0, 0.4);
    scene.add(ambient);

    // Hemisphere light for natural sky/ground fill
    const hemi = new THREE.HemisphereLight(0xd4ccff, 0x1e1b4b, 0.35);
    scene.add(hemi);

    const key = new THREE.DirectionalLight(0xfff5e8, 1.4);
    key.position.set(3, 5, 2);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 15;
    key.shadow.bias = -0.001;
    scene.add(key);

    const fill = new THREE.DirectionalLight(0xc8d8ff, 0.5);
    fill.position.set(-3, 3, -1);
    scene.add(fill);

    const rim = new THREE.PointLight(0xe0d0ff, 0.9, 10);
    rim.position.set(-2, 1.5, 3);
    scene.add(rim);

    const backLight = new THREE.PointLight(0xffd4a0, 0.4, 8);
    backLight.position.set(2, 0.5, -3);
    scene.add(backLight);

    // Ground plane — reflective showroom floor
    const groundGeo = new THREE.CircleGeometry(3, 48);
    const groundMat = new THREE.MeshPhysicalMaterial({
      color: 0x12101e, roughness: 0.4, metalness: 0.2,
      clearcoat: 0.5, clearcoatRoughness: 0.3,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.96;
    ground.receiveShadow = true;
    scene.add(ground);

    // Ground glow ring
    const ringGeo = new THREE.RingGeometry(0.8, 2.5, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x7c3aed, transparent: true, opacity: 0.08, side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -0.95;
    scene.add(ring);

    // Subtle inner ring
    const ringGeo2 = new THREE.RingGeometry(0.3, 0.8, 48);
    const ringMat2 = new THREE.MeshBasicMaterial({
      color: 0xa78bfa, transparent: true, opacity: 0.05, side: THREE.DoubleSide,
    });
    const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
    ring2.rotation.x = -Math.PI / 2;
    ring2.position.y = -0.949;
    scene.add(ring2);

    // Build horse
    const horse = build3DHorse(scene, horseColor);

    // Mouse interaction
    const onPointerDown = (e: PointerEvent) => {
      isDragging.current = true;
      autoRotate.current = false;
      prevMouse.current = { x: e.clientX, y: e.clientY };
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - prevMouse.current.x;
      const dy = e.clientY - prevMouse.current.y;
      rotation.current.y += dx * 0.01;
      rotation.current.x += dy * 0.005;
      rotation.current.x = Math.max(-0.5, Math.min(0.8, rotation.current.x));
      prevMouse.current = { x: e.clientX, y: e.clientY };
    };
    const onPointerUp = () => {
      isDragging.current = false;
      // resume auto-rotate after 3s idle
      setTimeout(() => { if (!isDragging.current) autoRotate.current = true; }, 3000);
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    // Animate
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      if (autoRotate.current) {
        rotation.current.y += 0.005;
      }
      horse.rotation.y = rotation.current.y;
      horse.rotation.x = rotation.current.x;

      // Subtle breathing motion
      const t = Date.now() * 0.001;
      horse.position.y = -0.25 + Math.sin(t * 0.8) * 0.008;

      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const onResize = () => {
      const newW = container.clientWidth || 300;
      camera.aspect = newW / h;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(frameRef.current);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [height, horseColor]);

  // Fallback for non-web
  if (Platform.OS !== 'web') {
    return (
      <View style={{ width: '100%', height, backgroundColor: '#1e1b4b', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: height * 0.35 }}>🐴</Text>
        {horseColor ? <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>{horseColor}</Text> : null}
      </View>
    );
  }

  return (
    <View
      ref={containerRef}
      style={{ width: '100%', height, backgroundColor: '#0f172a', cursor: 'grab' } as any}
    >
      <View style={{
        position: 'absolute', bottom: 8, left: 0, right: 0, alignItems: 'center', zIndex: 1,
        pointerEvents: 'none',
      } as any}>
        <Text style={{ fontSize: 10, color: '#8b9ab5', letterSpacing: 2, fontWeight: '600' }}>
          DRAG TO ROTATE
        </Text>
      </View>
    </View>
  );
}

// Helper: render horse image or 3D placeholder (with onError fallback)
function HorseImage({ uri, height, style, horseColor }: { uri: string; height: number; style?: any; horseColor?: string }) {
  const [failed, setFailed] = useState(false);
  if (!uri || failed) return <Horse3DPlaceholder height={height} horseColor={horseColor} />;
  return <Image source={{ uri }} style={[{ width: '100%', height, backgroundColor: '#0f172a' }, style]} resizeMode="contain" onError={() => setFailed(true)} />;
}

// ─── Types ───────────────────────────────────────────────────────────────
type Bid = { amount: number; bidder: string; timestamp: string };
type Auction = {
  id: string;
  horseName: string;
  breed: string;
  age: number;
  color: string;
  description: string;
  image: string;
  startingPrice: number;
  currentBid: number;
  bids: Bid[];
  endsAt: string;
  status: string;
  soldDate?: string;
};

// ─── Countdown Hook ──────────────────────────────────────────────────────
function useCountdown(endsAt: string) {
  const [timeLeft, setTimeLeft] = useState({ h: 0, m: 0, s: 0, expired: false, text: '' });
  useEffect(() => {
    const tick = () => {
      const diff = new Date(endsAt).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft({ h: 0, m: 0, s: 0, expired: true, text: 'Ended' });
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft({ h, m, s, expired: false, text: `${h}h ${m}m ${s}s` });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);
  return timeLeft;
}

// ─── Timer Display ───────────────────────────────────────────────────────
function TimerBlock({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.timerBlock}>
      <Text style={styles.timerBlockValue}>{String(value).padStart(2, '0')}</Text>
      <Text style={styles.timerBlockLabel}>{label}</Text>
    </View>
  );
}

function CountdownDisplay({ endsAt }: { endsAt: string }) {
  const { h, m, s, expired } = useCountdown(endsAt);
  if (expired) {
    return (
      <View style={styles.timerRow}>
        <Text style={styles.timerExpiredLabel}>AUCTION ENDED</Text>
      </View>
    );
  }
  return (
    <View style={styles.timerRow}>
      <TimerBlock value={h} label="HRS" />
      <Text style={styles.timerColon}>:</Text>
      <TimerBlock value={m} label="MIN" />
      <Text style={styles.timerColon}>:</Text>
      <TimerBlock value={s} label="SEC" />
    </View>
  );
}

// ─── "Start Auction" Modal ───────────────────────────────────────────────
function StartAuctionModal({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { isWide } = useResponsive();
  const [form, setForm] = useState({
    horseName: '',
    breed: '',
    age: '',
    color: '',
    description: '',
    image: '',
    startingPrice: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const update = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  const submit = async () => {
    setError('');
    if (!form.horseName.trim()) return setError('Horse name is required');
    if (!form.startingPrice || isNaN(Number(form.startingPrice)))
      return setError('Valid starting price is required');

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/auctions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          horseName: form.horseName.trim(),
          breed: form.breed.trim() || 'Unknown',
          age: parseInt(form.age, 10) || 0,
          color: form.color.trim() || 'Unknown',
          description: form.description.trim(),
          image: form.image.trim(),
          startingPrice: Number(form.startingPrice),
        }),
      });
      if (!res.ok) {
        const j = await res.json();
        setError(j.error || 'Failed');
        return;
      }
      setForm({ horseName: '', breed: '', age: '', color: '', description: '', image: '', startingPrice: '' });
      onCreated();
      onClose();
    } catch {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Overlay visible={visible}>
        <View style={[styles.modalContent, isWide && { width: 500 }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Start New Auction</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.fieldLabel}>Horse Name *</Text>
            <TextInput style={styles.fieldInput} placeholder="e.g. Thunder Bolt" placeholderTextColor="#94a3b8" value={form.horseName} onChangeText={(v) => update('horseName', v)} />

            <View style={styles.fieldRow}>
              <View style={styles.fieldHalf}>
                <Text style={styles.fieldLabel}>Breed</Text>
                <TextInput style={styles.fieldInput} placeholder="e.g. Arabian" placeholderTextColor="#94a3b8" value={form.breed} onChangeText={(v) => update('breed', v)} />
              </View>
              <View style={styles.fieldHalf}>
                <Text style={styles.fieldLabel}>Color</Text>
                <TextInput style={styles.fieldInput} placeholder="e.g. Bay" placeholderTextColor="#94a3b8" value={form.color} onChangeText={(v) => update('color', v)} />
              </View>
            </View>

            <View style={styles.fieldRow}>
              <View style={styles.fieldHalf}>
                <Text style={styles.fieldLabel}>Age</Text>
                <TextInput style={styles.fieldInput} placeholder="e.g. 5" placeholderTextColor="#94a3b8" keyboardType="numeric" value={form.age} onChangeText={(v) => update('age', v)} />
              </View>
              <View style={styles.fieldHalf}>
                <Text style={styles.fieldLabel}>Starting Price ($) *</Text>
                <TextInput style={styles.fieldInput} placeholder="e.g. 10000" placeholderTextColor="#94a3b8" keyboardType="numeric" value={form.startingPrice} onChangeText={(v) => update('startingPrice', v)} />
              </View>
            </View>

            <Text style={styles.fieldLabel}>Image URL</Text>
            <TextInput style={styles.fieldInput} placeholder="https://... (leave blank for default)" placeholderTextColor="#94a3b8" value={form.image} onChangeText={(v) => update('image', v)} />

            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput style={[styles.fieldInput, { height: 80, textAlignVertical: 'top' }]} placeholder="Tell buyers about this horse..." placeholderTextColor="#94a3b8" multiline value={form.description} onChangeText={(v) => update('description', v)} />

            {error ? <Text style={styles.formError}>{error}</Text> : null}

            <TouchableOpacity style={[styles.submitBtn, submitting && { opacity: 0.6 }]} onPress={submit} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>🐴 Start 24h Auction</Text>}
            </TouchableOpacity>
            <Text style={styles.formNote}>Auction runs for 24 hours. All bids are anonymous.</Text>
          </ScrollView>
        </View>
    </Overlay>
  );
}

// ─── Auction Detail Modal ────────────────────────────────────────────────
function AuctionDetailModal({
  auction,
  onClose,
  onBidPlaced,
}: {
  auction: Auction | null;
  onClose: () => void;
  onBidPlaced: () => void;
}) {
  const { isWide } = useResponsive();
  const [bidAmount, setBidAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (auction) {
      setBidAmount('');
      setError('');
      setSuccess('');
    }
  }, [auction]);

  const { expired } = useCountdown(auction?.endsAt ?? new Date().toISOString());
  if (!auction) return null;
  const quickBids = [100, 500, 1000, 5000];

  const placeBid = async (amount: number) => {
    setError('');
    setSuccess('');
    if (isNaN(amount) || amount <= auction.currentBid) {
      setError(`Bid must be higher than $${auction.currentBid.toLocaleString()}`);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/auctions/${auction.id}/bids`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Failed');
      } else {
        setSuccess(`Bid of $${amount.toLocaleString()} placed!`);
        setBidAmount('');
        onBidPlaced();
      }
    } catch {
      setError('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Overlay visible={!!auction}>
        <View style={[styles.detailModal, isWide && { width: 560 }]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <HorseImage uri={auction.image} height={280} horseColor={auction.color} />
            {auction.status === 'sold' && (
              <View style={styles.detailSoldBadge}>
                <Text style={styles.detailSoldBadgeText}>SOLD</Text>
              </View>
            )}
            <TouchableOpacity style={styles.detailCloseBtn} onPress={onClose}>
              <Text style={styles.detailCloseTxt}>✕</Text>
            </TouchableOpacity>

            <View style={styles.detailBody}>
              <Text style={styles.detailName}>{auction.horseName}</Text>
              <View style={styles.detailTags}>
                <View style={styles.tag}><Text style={styles.tagText}>{auction.breed}</Text></View>
                <View style={styles.tag}><Text style={styles.tagText}>{auction.age} yrs</Text></View>
                <View style={styles.tag}><Text style={styles.tagText}>{auction.color}</Text></View>
              </View>
              <Text style={styles.detailDesc}>{auction.description}</Text>

              {auction.status === 'sold' ? (
                <View style={styles.detailTimerWrap}>
                  <Text style={styles.detailTimerLabel}>AUCTION COMPLETED</Text>
                  <Text style={styles.detailSoldDate}>
                    {new Date(auction.soldDate || auction.endsAt).toLocaleDateString('en-US', {
                      year: 'numeric', month: 'long', day: 'numeric',
                    })}
                  </Text>
                </View>
              ) : (
                <View style={styles.detailTimerWrap}>
                  <Text style={styles.detailTimerLabel}>AUCTION ENDS IN</Text>
                  <CountdownDisplay endsAt={auction.endsAt} />
                </View>
              )}

              <View style={styles.detailBidInfo}>
                <View style={styles.detailBidCol}>
                  <Text style={styles.detailBidLabel}>{auction.status === 'sold' ? 'Final Price' : 'Current Bid'}</Text>
                  <Text style={[styles.detailBidValue, auction.status === 'sold' && styles.detailBidValueSold]}>${auction.currentBid.toLocaleString()}</Text>
                </View>
                <View style={styles.detailBidCol}>
                  <Text style={styles.detailBidLabel}>Starting</Text>
                  <Text style={styles.detailBidStart}>${auction.startingPrice.toLocaleString()}</Text>
                </View>
                <View style={styles.detailBidCol}>
                  <Text style={styles.detailBidLabel}>Total Bids</Text>
                  <Text style={styles.detailBidStart}>{auction.bids.length}</Text>
                </View>
              </View>

              {!expired && (
                <>
                  <Text style={styles.quickBidLabel}>Quick Bid</Text>
                  <View style={styles.quickBidRow}>
                    {quickBids.map((inc) => (
                      <TouchableOpacity
                        key={inc}
                        style={styles.quickBidBtn}
                        disabled={submitting}
                        onPress={() => placeBid(auction.currentBid + inc)}
                      >
                        <Text style={styles.quickBidBtnText}>+${inc.toLocaleString()}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.quickBidLabel}>Custom Bid</Text>
                  <View style={styles.customBidRow}>
                    <TextInput
                      style={styles.detailBidInput}
                      placeholder={`Min $${(auction.currentBid + 1).toLocaleString()}`}
                      placeholderTextColor="#94a3b8"
                      keyboardType="numeric"
                      value={bidAmount}
                      onChangeText={setBidAmount}
                      editable={!submitting}
                    />
                    <TouchableOpacity
                      style={[styles.detailBidBtn, submitting && { opacity: 0.5 }]}
                      onPress={() => placeBid(parseInt(bidAmount, 10))}
                      disabled={submitting}
                    >
                      {submitting ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={styles.detailBidBtnText}>Place Bid</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {error ? <Text style={styles.msgError}>{error}</Text> : null}
              {success ? <Text style={styles.msgSuccess}>{success}</Text> : null}

              {auction.bids.length > 0 && (
                <View style={styles.historySection}>
                  <Text style={styles.historyTitle}>Bid History</Text>
                  {auction.bids
                    .slice()
                    .reverse()
                    .map((bid, idx) => (
                      <View key={idx} style={styles.historyRow}>
                        <View style={styles.historyDot} />
                        <Text style={styles.historyBidder}>{bid.bidder}</Text>
                        <Text style={styles.historyAmount}>${bid.amount.toLocaleString()}</Text>
                        <Text style={styles.historyTime}>
                          {new Date(bid.timestamp).toLocaleTimeString()}
                        </Text>
                      </View>
                    ))}
                </View>
              )}
            </View>
          </ScrollView>
        </View>
    </Overlay>
  );
}

// ─── Auction Card (list item) ────────────────────────────────────────────
function AuctionCard({ auction, onPress }: { auction: Auction; onPress: () => void }) {
  const { text, expired } = useCountdown(auction.endsAt);
  const bidPercent = auction.startingPrice > 0
    ? Math.min(((auction.currentBid - auction.startingPrice) / auction.startingPrice) * 100, 100)
    : 0;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`${auction.horseName}, ${auction.breed}, ${expired ? 'ended' : 'active'} auction, current bid $${auction.currentBid.toLocaleString()}`}
    >
      <HorseImage uri={auction.image} height={220} horseColor={auction.color} />
      <View style={[styles.cardBadge, expired && styles.cardBadgeEnded]}>
        <Text style={styles.cardBadgeText}>{expired ? 'ENDED' : text}</Text>
      </View>
      {auction.bids.length > 0 && (
        <View style={styles.hotBadge}>
          <Text style={styles.hotBadgeText}>🔥 {auction.bids.length} bid{auction.bids.length > 1 ? 's' : ''}</Text>
        </View>
      )}
      <View style={styles.cardBody}>
        <Text style={styles.cardName}>{auction.horseName}</Text>
        <Text style={styles.cardBreed}>{auction.breed} · {auction.age} yrs · {auction.color}</Text>
        <View style={styles.cardPriceRow}>
          <View>
            <Text style={[styles.cardPriceLabel, expired && styles.cardPriceLabelEnded]}>
              {expired ? 'Final Price' : 'Current Bid'}
            </Text>
            <Text style={[styles.cardPrice, expired && styles.cardPriceEnded]}>
              ${auction.currentBid.toLocaleString()}
            </Text>
          </View>
          <View style={styles.cardBidBtnWrap}>
            <View style={[styles.cardBidBtn, expired && styles.cardBidBtnEnded]}>
              <Text style={styles.cardBidBtnText}>{expired ? 'View' : 'Bid Now →'}</Text>
            </View>
          </View>
        </View>
        {bidPercent > 0 && (
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, expired && styles.progressFillEnded, { width: `${bidPercent}%` }]} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Sold Auction Card ───────────────────────────────────────────────────
function SoldAuctionCard({ auction, onPress }: { auction: Auction; onPress: () => void }) {
  const soldDate = auction.soldDate
    ? new Date(auction.soldDate)
    : new Date(auction.endsAt);
  const daysAgo = Math.floor((Date.now() - soldDate.getTime()) / 86400000);
  const timeLabel = daysAgo === 0 ? 'Today' : daysAgo === 1 ? '1 day ago' : `${daysAgo} days ago`;
  const priceDiff = auction.currentBid - auction.startingPrice;
  const priceUp = priceDiff > 0 ? Math.round((priceDiff / auction.startingPrice) * 100) : 0;

  return (
    <TouchableOpacity
      style={soldStyles.card}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`${auction.horseName}, ${auction.breed}, sold for $${auction.currentBid.toLocaleString()}, ${timeLabel}`}
    >
      <View style={soldStyles.imageWrap}>
        <HorseImage uri={auction.image} height={180} horseColor={auction.color} />
        <View style={soldStyles.overlay} />
        <View style={soldStyles.soldRibbon}>
          <Text style={soldStyles.soldRibbonText}>SOLD</Text>
        </View>
      </View>
      <View style={soldStyles.body}>
        <Text style={soldStyles.name}>{auction.horseName}</Text>
        <Text style={soldStyles.breed}>{auction.breed} · {auction.age} yrs</Text>
        <View style={soldStyles.divider} />
        <View style={soldStyles.priceRow}>
          <View>
            <Text style={soldStyles.priceLabel}>Final Price</Text>
            <Text style={soldStyles.price} accessibilityLabel={`Final price $${auction.currentBid.toLocaleString()}`}>${auction.currentBid.toLocaleString()}</Text>
          </View>
          {priceUp > 0 && (
            <View style={soldStyles.uptick}>
              <Text style={soldStyles.uptickText}>▲ {priceUp}%</Text>
            </View>
          )}
        </View>
        <View style={soldStyles.metaRow}>
          <Text style={soldStyles.meta}>🏷 {auction.bids.length} bid{auction.bids.length !== 1 ? 's' : ''}</Text>
          <Text style={soldStyles.meta}>🕐 {timeLabel}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const soldStyles = StyleSheet.create({
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
    ...(Platform.OS === 'web' ? { boxShadow: '0 2px 12px rgba(0,0,0,0.25)' } : { elevation: 4 }),
  },
  imageWrap: { position: 'relative', overflow: 'hidden' },
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(15,23,42,0.35)',
  },
  soldRibbon: {
    position: 'absolute',
    top: 16,
    right: -28,
    backgroundColor: '#dc2626',
    paddingHorizontal: 36,
    paddingVertical: 6,
    transform: [{ rotate: '35deg' }],
    zIndex: 2,
  },
  soldRibbonText: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  body: { padding: 14 },
  name: { fontSize: 17, fontWeight: '700', color: '#e2e8f0' },
  breed: { fontSize: 12, color: '#8b9ab5', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#334155', marginVertical: 10 },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  priceLabel: { fontSize: 10, color: '#8b9ab5', fontWeight: '600', textTransform: 'uppercase' },
  price: { fontSize: 22, fontWeight: '800', color: '#fbbf24' },
  uptick: { backgroundColor: 'rgba(34,197,94,0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  uptickText: { color: '#22c55e', fontSize: 12, fontWeight: '700' },
  metaRow: { flexDirection: 'row', gap: 16, marginTop: 10 },
  meta: { fontSize: 12, color: '#8b9ab5' },
});

const soldSectionStyles = StyleSheet.create({
  section: { marginTop: 32, paddingTop: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 12 },
  headerLine: { flex: 1, height: 1, backgroundColor: '#334155' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fbbf24' },
  headerSub: { fontSize: 13, color: '#94a3b8', textAlign: 'center', marginBottom: 20 },
});

// ─── App Root ────────────────────────────────────────────────────────────
export default function App() {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null);
  const selectedRef = useRef<Auction | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const { cols, isWide, isDesktop, width: screenWidth } = useResponsive();

  // Keep ref in sync so fetchAuctions never has a stale closure
  useEffect(() => { selectedRef.current = selectedAuction; }, [selectedAuction]);

  const fetchAuctions = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/auctions`);
      const json = await res.json();
      const data: Auction[] = json.data || [];
      setAuctions(data);
      // Update selected auction if still open (read from ref to avoid stale closure)
      const sel = selectedRef.current;
      if (sel) {
        const updated = data.find((a) => a.id === sel.id);
        if (updated) setSelectedAuction(updated);
      }
    } catch (e) {
      console.error('[Horse Auction] Fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    console.log('[Horse Auction] App mounted, fetching auctions from:', API_URL);
    fetchAuctions();
    const id = setInterval(fetchAuctions, 5000);
    return () => clearInterval(id);
  }, [fetchAuctions]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#7c3aed" />
        <Text style={styles.loadingText}>Loading auctions...</Text>
        <StatusBar style="light" />
      </View>
    );
  }

  const active = auctions.filter((a) => new Date(a.endsAt) > new Date());
  const ended = auctions.filter((a) => new Date(a.endsAt) <= new Date());

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerInner}>
          <View>
            <Text style={styles.headerTitle}>🐴 Horse Auction</Text>
            <Text style={styles.headerSub}>{active.length} active auction{active.length !== 1 ? 's' : ''} · Anonymous bidding</Text>
          </View>
          <TouchableOpacity style={styles.newAuctionBtn} onPress={() => setShowCreate(true)}>
            <Text style={styles.newAuctionBtnText}>+ Start Auction</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Auction Grid */}
      <ScrollView
        contentContainerStyle={[styles.list, isDesktop && { paddingHorizontal: 40 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAuctions(); }} />}
      >
        {/* Active Auctions */}
        {active.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyIcon}>🐴</Text>
            <Text style={styles.emptyTitle}>No Auctions Yet</Text>
            <Text style={styles.emptySub}>Start the first auction!</Text>
            <TouchableOpacity style={styles.newAuctionBtn} onPress={() => setShowCreate(true)}>
              <Text style={styles.newAuctionBtnText}>+ Start Auction</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 }}>
            {active.map((item) => (
              <View
                key={item.id}
                style={cols > 1 ? { width: `${100 / cols}%` as any, paddingHorizontal: 6 } : { width: '100%' }}
              >
                <AuctionCard auction={item} onPress={() => setSelectedAuction(item)} />
              </View>
            ))}
          </View>
        )}

        {/* Recently Sold Section */}
        {ended.length > 0 && (
          <View style={soldSectionStyles.section}>
            <View style={soldSectionStyles.headerRow}>
              <View style={soldSectionStyles.headerLine} />
              <Text style={soldSectionStyles.headerTitle}>🏆 Recently Sold</Text>
              <View style={soldSectionStyles.headerLine} />
            </View>
            <Text style={soldSectionStyles.headerSub}>
              {ended.length} horse{ended.length !== 1 ? 's' : ''} sold · $
              {ended.reduce((sum, a) => sum + a.currentBid, 0).toLocaleString()} total
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 }}>
              {ended
                .sort((a, b) => new Date(b.endsAt).getTime() - new Date(a.endsAt).getTime())
                .map((item) => (
                  <View
                    key={item.id}
                    style={cols > 1 ? { width: `${100 / cols}%` as any, paddingHorizontal: 6 } : { width: '100%' }}
                  >
                    <SoldAuctionCard auction={item} onPress={() => setSelectedAuction(item)} />
                  </View>
                ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Detail Modal */}
      <AuctionDetailModal
        auction={selectedAuction}
        onClose={() => setSelectedAuction(null)}
        onBidPlaced={fetchAuctions}
      />

      {/* Create Modal */}
      <StartAuctionModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={fetchAuctions}
      />

      <StatusBar style="light" />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f172a' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#94a3b8' },

  // Header
  header: { backgroundColor: '#1e1b4b', paddingTop: 52, paddingBottom: 16, paddingHorizontal: 20 },
  headerInner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 13, color: '#a5b4fc', marginTop: 2 },
  newAuctionBtn: { backgroundColor: '#7c3aed', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  newAuctionBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // List
  list: { padding: 16, paddingBottom: 40 },

  // Card
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    marginBottom: 18,
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? { boxShadow: '0 4px 20px rgba(0,0,0,0.3)' } : { elevation: 6 }),
  },
  cardImage: { width: '100%', height: 220 },
  cardBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(124,58,237,0.9)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  cardBadgeEnded: { backgroundColor: 'rgba(220,38,38,0.85)' },
  cardBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  hotBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(245,158,11,0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  hotBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  cardBody: { padding: 16 },
  cardName: { fontSize: 20, fontWeight: '700', color: '#f1f5f9', marginBottom: 2 },
  cardBreed: { fontSize: 13, color: '#94a3b8', marginBottom: 12 },
  cardPriceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  cardPriceLabel: { fontSize: 11, color: '#8b9ab5', textTransform: 'uppercase', fontWeight: '600' },
  cardPriceLabelEnded: { color: '#94a3b8' },
  cardPrice: { fontSize: 24, fontWeight: '800', color: '#34d399' },
  cardPriceEnded: { color: '#94a3b8' },
  cardBidBtnEnded: { backgroundColor: '#475569' },
  progressFillEnded: { backgroundColor: '#475569' },
  cardBidBtnWrap: { alignItems: 'flex-end' },
  cardBidBtn: { backgroundColor: '#7c3aed', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  cardBidBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  progressBar: { height: 4, backgroundColor: '#334155', borderRadius: 2, marginTop: 12, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#34d399', borderRadius: 2 },

  // Empty
  emptyWrap: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: '#f1f5f9', marginBottom: 4 },
  emptySub: { fontSize: 14, color: '#8b9ab5', marginBottom: 20 },

  // Timer blocks
  timerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  timerBlock: { backgroundColor: '#1e1b4b', borderRadius: 8, padding: 10, alignItems: 'center', minWidth: 54 },
  timerBlockValue: { fontSize: 22, fontWeight: '800', color: '#fff' },
  timerBlockLabel: { fontSize: 9, color: '#a5b4fc', fontWeight: '600', marginTop: 2 },
  timerColon: { fontSize: 22, fontWeight: '800', color: '#7c3aed', marginHorizontal: 6 },
  timerExpiredLabel: { fontSize: 16, fontWeight: '700', color: '#ef4444' },

  // Modal content
  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    width: '92%',
    maxHeight: '85%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#f1f5f9' },
  modalClose: { fontSize: 22, color: '#94a3b8', fontWeight: '600' },
  modalScroll: { padding: 20 },

  // Form fields
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6, marginTop: 14 },
  fieldInput: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#f1f5f9',
    fontSize: 15,
  },
  fieldRow: { flexDirection: 'row', gap: 12 },
  fieldHalf: { flex: 1 },
  formError: { color: '#ef4444', fontSize: 13, marginTop: 12 },
  submitBtn: { backgroundColor: '#7c3aed', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  formNote: { fontSize: 12, color: '#8b9ab5', textAlign: 'center', marginTop: 10, marginBottom: 20 },

  // Detail modal
  detailModal: {
    backgroundColor: '#1e293b',
    borderRadius: 20,
    width: '95%',
    maxHeight: '92%',
    overflow: 'hidden',
  },
  detailImage: { width: '100%', height: 280 },
  detailSoldBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#dc2626',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    zIndex: 10,
  },
  detailSoldBadgeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  detailSoldDate: {
    fontSize: 16,
    color: '#fbbf24',
    fontWeight: '700',
    marginTop: 4,
  },
  detailBidValueSold: { color: '#fbbf24' },
  detailCloseBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailCloseTxt: { color: '#fff', fontSize: 18, fontWeight: '700' },
  detailBody: { padding: 20 },
  detailName: { fontSize: 26, fontWeight: '800', color: '#f1f5f9', marginBottom: 8 },
  detailTags: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tag: { backgroundColor: '#334155', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  tagText: { color: '#a5b4fc', fontSize: 12, fontWeight: '600' },
  detailDesc: { fontSize: 14, color: '#94a3b8', lineHeight: 22, marginBottom: 20 },
  detailTimerWrap: { alignItems: 'center', marginBottom: 20, paddingVertical: 16, backgroundColor: '#0f172a', borderRadius: 12 },
  detailTimerLabel: { fontSize: 11, fontWeight: '700', color: '#8b9ab5', letterSpacing: 1.5, marginBottom: 4 },
  detailBidInfo: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20, paddingVertical: 14, backgroundColor: '#0f172a', borderRadius: 12 },
  detailBidCol: { alignItems: 'center' },
  detailBidLabel: { fontSize: 10, color: '#8b9ab5', fontWeight: '600', textTransform: 'uppercase', marginBottom: 2 },
  detailBidValue: { fontSize: 26, fontWeight: '800', color: '#34d399' },
  detailBidStart: { fontSize: 18, fontWeight: '600', color: '#f1f5f9' },

  // Quick bid
  quickBidLabel: { fontSize: 12, fontWeight: '700', color: '#8b9ab5', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 1 },
  quickBidRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  quickBidBtn: { flex: 1, backgroundColor: '#334155', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  quickBidBtnText: { color: '#34d399', fontWeight: '700', fontSize: 14 },

  // Custom bid
  customBidRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  detailBidInput: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#f1f5f9',
    fontSize: 16,
  },
  detailBidBtn: { backgroundColor: '#7c3aed', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, justifyContent: 'center' },
  detailBidBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Messages
  msgError: { color: '#ef4444', fontSize: 13, marginTop: 6, marginBottom: 4 },
  msgSuccess: { color: '#34d399', fontSize: 13, marginTop: 6, marginBottom: 4 },

  // Bid history
  historySection: { marginTop: 20, borderTopWidth: 1, borderTopColor: '#334155', paddingTop: 14 },
  historyTitle: { fontSize: 14, fontWeight: '700', color: '#f1f5f9', marginBottom: 10 },
  historyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  historyDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#7c3aed', marginRight: 10 },
  historyBidder: { flex: 1, color: '#94a3b8', fontSize: 13 },
  historyAmount: { color: '#34d399', fontWeight: '700', fontSize: 14, marginRight: 12 },
  historyTime: { color: '#475569', fontSize: 11 },
});
