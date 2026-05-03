import * as THREE from 'three';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { ViewName, ViewRequest } from '@shared/types';

// Standard viewpoints, expressed as the camera's normalized direction in the
// scene's world space. The OpenSCAD STL is rotated -90deg around X before it
// renders (see ThreeScene), so "top" here points along world +Y after that
// rotation — i.e. matches what the user sees in the gizmo cube.
const VIEW_DIRECTIONS: Record<Exclude<ViewName, 'custom'>, [number, number, number]> = {
  iso: [-1, 1, 1],
  front: [0, 0, 1],
  back: [0, 0, -1],
  left: [-1, 0, 0],
  right: [1, 0, 0],
  top: [0, 1, 0],
  bottom: [0, -1, 0],
};

// Default custom-view spherical coords. Both `viewToDirection` and
// `viewLabel` read the same constants so an omitted azimuth/elevation
// renders and labels consistently.
const DEFAULT_CUSTOM_AZIMUTH_DEG = 30;
const DEFAULT_CUSTOM_ELEVATION_DEG = 25;

// Convert a ViewRequest into a normalized camera direction vector.
function viewToDirection(req: ViewRequest): THREE.Vector3 {
  if (req.view === 'custom') {
    // Spherical → Cartesian. Azimuth=0/elevation=0 ⇒ +Z (front).
    const az = ((req.azimuth ?? DEFAULT_CUSTOM_AZIMUTH_DEG) * Math.PI) / 180;
    const el =
      ((req.elevation ?? DEFAULT_CUSTOM_ELEVATION_DEG) * Math.PI) / 180;
    const x = Math.cos(el) * Math.sin(az);
    const y = Math.sin(el);
    const z = Math.cos(el) * Math.cos(az);
    return new THREE.Vector3(x, y, z).normalize();
  }
  const [x, y, z] = VIEW_DIRECTIONS[req.view] ?? VIEW_DIRECTIONS.iso;
  return new THREE.Vector3(x, y, z).normalize();
}

export function viewLabel(req: ViewRequest): string {
  if (req.label) return req.label;
  if (req.view === 'custom') {
    const az = req.azimuth ?? DEFAULT_CUSTOM_AZIMUTH_DEG;
    const el = req.elevation ?? DEFAULT_CUSTOM_ELEVATION_DEG;
    return `custom (az ${Math.round(az)}°, el ${Math.round(el)}°)`;
  }
  return req.view;
}

interface RenderOptions {
  size?: number;
  background?: number;
  color?: number;
}

// Render the STL `output` from each requested view. We re-parse the STL into
// a fresh BufferGeometry rather than reusing the live preview's geometry so
// this can run independently of the on-screen viewer (and won't be disturbed
// by the user pivoting the gizmo cube mid-capture).
export async function renderArtifactFromViews(
  output: Blob,
  views: ViewRequest[],
  opts: RenderOptions = {},
): Promise<Blob[]> {
  const size = opts.size ?? 768;
  const background = opts.background ?? 0x3b3b3b;
  const color = opts.color ?? 0x00a6ff;

  const buffer = await output.arrayBuffer();
  const loader = new STLLoader();
  const geometry = loader.parse(buffer);
  geometry.center();
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();

  const box = geometry.boundingBox!;
  const dim = new THREE.Vector3();
  box.getSize(dim);
  const maxDim = Math.max(dim.x, dim.y, dim.z) || 1;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: true,
  });
  renderer.setSize(size, size);
  renderer.setPixelRatio(1);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(background);

  const material = new THREE.MeshStandardMaterial({
    color,
    metalness: 0.4,
    roughness: 0.5,
  });
  const mesh = new THREE.Mesh(geometry, material);
  // Mirror the live viewer's STL orientation so screenshots match what the
  // user sees in the on-screen preview.
  mesh.rotation.set(-Math.PI / 2, 0, 0);
  scene.add(mesh);

  scene.add(new THREE.AmbientLight(0xffffff, 0.8));
  const dir1 = new THREE.DirectionalLight(0xffffff, 1.2);
  dir1.position.set(5, 5, 5);
  scene.add(dir1);
  const dir2 = new THREE.DirectionalLight(0xffffff, 0.4);
  dir2.position.set(-5, 5, -5);
  scene.add(dir2);
  const dir3 = new THREE.DirectionalLight(0xffffff, 0.4);
  dir3.position.set(0, -5, 0);
  scene.add(dir3);

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, maxDim * 50);
  // Distance chosen so the longest dimension comfortably fills ~70% of frame
  // at fov=35 — closer than the live preview to make features legible at
  // 768px capture resolution.
  const distance = maxDim * 2.4;

  const blobs: Blob[] = [];
  try {
    for (const req of views) {
      const dirNorm = viewToDirection(req);
      const dir = dirNorm.clone().multiplyScalar(distance);
      camera.position.set(dir.x, dir.y, dir.z);

      // `top` and `bottom` look straight down/up the world Y axis. With the
      // default `up = (0, 1, 0)`, three.js's lookAt computes
      // `right = up × viewDir`, which is the zero vector when up and the
      // view direction are parallel — producing a degenerate view matrix
      // and a black render. Pick a perpendicular up axis (world +Z, the
      // user-facing "front" direction after the scene's -90° X rotation)
      // so the viewer ends up looking at the model with a sensible
      // orientation. Anything not within ~1° of vertical falls through to
      // the default up.
      if (Math.abs(dirNorm.y) > 0.999) {
        camera.up.set(0, 0, 1);
      } else {
        camera.up.set(0, 1, 0);
      }
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();

      renderer.render(scene, camera);

      // PNG is lossless — the third arg to toBlob is ignored for image/png.
      // Drop it so the call doesn't read like we're tuning compression.
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) =>
            b ? resolve(b) : reject(new Error('canvas.toBlob returned null')),
          'image/png',
        );
      });
      blobs.push(blob);
    }
  } finally {
    renderer.dispose();
    geometry.dispose();
    material.dispose();
  }

  return blobs;
}
