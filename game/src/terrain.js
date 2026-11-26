// Ridge Runner: Alpine Mail Run — the world: terrain, river, runway, trees.
// One job: answer "how high is the ground here?" and "where is the camera
// looking?" for any point in the valley, deterministically.

import { CONFIG, mulberry32 } from './config.js';

// Rolling valley floor: gentle swells along the valley, plus mountain
// walls once |x| passes the wide valley floor. The walls rise gently
// enough that the green valley reads from the air, with rock mid-slopes
// and snow only on the high peaks.
export function terrainHeight(x, z) {
  const ax = Math.abs(x);
  const floor =
    4.5 * Math.sin(z * 0.008) +
    3.0 * Math.sin(z * 0.021 + 1.7) +
    2.0 * Math.sin(z * 0.047 + 4.1);
  const wall = Math.max(0, ax - CONFIG.mountainStart);
  const mountains = wall * wall * 0.011 + 5 * Math.sin(z * 0.013 + ax * 0.05);
  return floor + mountains;
}

// The river winds down the valley floor, never under the runway.
export function riverX(z) {
  return 34 * Math.sin(z * 0.004) + 18 * Math.sin(z * 0.0013 + 2.0) + 26;
}

// Is this point on the runway strip itself (for landing checks)?
export function onRunway(x, z) {
  return (
    Math.abs(x) <= CONFIG.runwayHalfWidth &&
    z >= CONFIG.runwayStartZ &&
    z <= CONFIG.runwayEndZ
  );
}

// The runway is a flat strip: the ground is levelled to zero there so a
// landing reads as a landing, not a crash into a hill.
export function groundHeight(x, z) {
  if (
    Math.abs(x) <= CONFIG.runwayHalfWidth + 3 &&
    z >= CONFIG.runwayStartZ - 20 &&
    z <= CONFIG.runwayEndZ + 20
  ) {
    return 0;
  }
  return terrainHeight(x, z);
}

// A pinhole camera that chases the plane from behind and slightly above.
// Returns screen coordinates for a world point, or null when it is behind
// the camera.
export function project(point, camera, view) {
  const dz = point.z - camera.z;
  if (dz < 1.5) return null;
  const focal = view.height * 1.15;
  const sx = view.width / 2 + ((point.x - camera.x) * focal) / dz;
  const sy = view.horizonY - ((point.y - camera.y) * focal) / dz;
  return { x: sx, y: sy, scale: focal / dz, depth: dz };
}

// The camera sits behind the plane and eases toward it, so the view never
// snaps when the pilot banks hard.
export function followCamera(camera, plane, dt) {
  const target = {
    x: plane.x * 0.82,
    y: plane.y + 5.5,
    z: plane.z - 16,
  };
  const ease = 1 - Math.pow(0.0015, dt);
  camera.x += (target.x - camera.x) * ease;
  camera.y += (target.y - camera.y) * ease;
  camera.z += (target.z - camera.z) * ease;
  return camera;
}

// Pine trees dotted along the valley sides, placed once from the world seed
// so the same trees stand in every run and every screenshot.
export function makeTrees() {
  const rand = mulberry32(CONFIG.worldSeed ^ 0x9e3779b9);
  const trees = [];
  for (let i = 0; i < 260; i++) {
    const side = rand() < 0.5 ? -1 : 1;
    const x = side * (28 + rand() * 95);
    const z = 60 + rand() * 3300;
    trees.push({ x, z, h: 7 + rand() * 7, w: 3 + rand() * 2.5 });
  }
  return trees.sort((a, b) => b.z - a.z);
}

// Clouds hang in the sky at fixed world spots, drifting slowly with the wind.
export function makeClouds() {
  const rand = mulberry32(CONFIG.worldSeed ^ 0x51ab3f);
  const clouds = [];
  for (let i = 0; i < 26; i++) {
    clouds.push({
      x: -260 + rand() * 520,
      y: 95 + rand() * 70,
      z: 120 + rand() * 2400,
      r: 22 + rand() * 34,
    });
  }
  return clouds;
}
