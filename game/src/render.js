// Ridge Runner: Alpine Mail Run — everything the pilot sees.
// One job: paint one frame of the valley, the plane and the rings from the
// camera's point of view. No game logic lives here, only drawing.

import { CONFIG } from './config.js';
import { project, terrainHeight, riverX, groundHeight } from './terrain.js';

// Paint the sky: a dawn gradient, a low sun with a halo, and drifting clouds.
function drawSky(ctx, view, camera, clouds, time) {
  const sky = ctx.createLinearGradient(0, 0, 0, view.horizonY + 40);
  sky.addColorStop(0, '#2e5f9e');
  sky.addColorStop(0.55, '#7fb2dd');
  sky.addColorStop(0.85, '#f6c98d');
  sky.addColorStop(1, '#f2a56b');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, view.width, view.horizonY + 40);

  // The sun sits low over the valley's far end, where the pilot is heading.
  const sunX = view.width * 0.62 - camera.x * 0.35;
  const sunY = view.horizonY - 130;
  const halo = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 130);
  halo.addColorStop(0, 'rgba(255, 236, 180, 0.95)');
  halo.addColorStop(0.35, 'rgba(255, 205, 120, 0.45)');
  halo.addColorStop(1, 'rgba(255, 205, 120, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(sunX - 140, sunY - 140, 280, 280);
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath();
  ctx.arc(sunX, sunY, 30, 0, Math.PI * 2);
  ctx.fill();

  // Clouds drift with the wind and parallax against the camera. A cloud
  // too close to the camera would fill the sky, so near clouds are skipped
  // and the rest are capped: clouds are dressing, never a white wall, and
  // never big enough to swallow a HUD panel.
  ctx.fillStyle = 'rgba(255, 250, 244, 0.8)';
  for (const cloud of clouds) {
    const drift = ((time * 1.5 + cloud.z * 0.7) % 900) - 450;
    const p = project({ x: cloud.x + drift * 0.2, y: cloud.y, z: cloud.z }, camera, view);
    if (!p || p.depth < 90) continue;
    const r = Math.min(48, Math.max(4, cloud.r * p.scale * 0.55));
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, r * 1.7, r * 0.55, 0, 0, Math.PI * 2);
    ctx.ellipse(p.x - r * 0.8, p.y + r * 0.14, r * 0.9, r * 0.4, 0, 0, Math.PI * 2);
    ctx.ellipse(p.x + r * 0.85, p.y + r * 0.12, r, r * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Ground colour by height, blended smoothly: green valley, grey rock,
// white snow — then hazed toward the sky with distance, so far ridges read
// as atmosphere instead of hard stripes.
function groundColor(h, depth) {
  const mix = (a, b, t) => a + (b - a) * t;
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  // Green (low) -> rock (mid) -> snow (high), smooth across the joins.
  let r;
  let g;
  let b;
  if (h < 14) {
    const t = clamp01(h / 14);
    r = mix(93, 122, t);
    g = mix(138, 125, t);
    b = mix(78, 96, t);
  } else if (h < CONFIG.snowLine) {
    const t = clamp01((h - 14) / (CONFIG.snowLine - 14));
    r = mix(122, 238, t);
    g = mix(125, 243, t);
    b = mix(96, 246, t);
  } else {
    r = 238;
    g = 243;
    b = 246;
  }
  const haze = clamp01(depth / CONFIG.viewDistance) * 0.55;
  r = mix(r, 184, haze);
  g = mix(g, 207, haze);
  b = mix(b, 224, haze);
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

// Paint the ground as bands of perspective slices, far to near, so the
// valley floor, the river and the runway all converge on the horizon.
function drawGround(ctx, view, camera, trees) {
  // A base wash below the horizon first: it hides the hairline seams
  // between adjacent ground bands, so the valley never shows white cracks.
  ctx.fillStyle = '#5d8a4e';
  ctx.fillRect(0, view.horizonY, view.width, view.height - view.horizonY);

  const slices = [];
  let z = camera.z + 10;
  while (z < camera.z + CONFIG.viewDistance) {
    slices.push(z);
    z += Math.max(6, (z - camera.z) * 0.09);
  }
  // Sample points across the valley. The centre points (-10..10) follow the
  // flattened runway, so the strip is never buried under an interpolated
  // hill between the wider samples.
  const xs = [-150, -107, -64, -40, -21, -10, -7, 0, 7, 10, 21, 40, 64, 107, 150];

  // Far slices first; each nearer band overpaints the one behind it.
  for (let s = slices.length - 1; s >= 0; s--) {
    const z0 = slices[s];
    const z1 = s + 1 < slices.length ? slices[s + 1] : z0 + 30;
    const top = [];
    const bottom = [];
    let sumH = 0;
    for (const x of xs) {
      const h0 = groundHeight(x, z0);
      const h1 = groundHeight(x, z1);
      sumH += h0 + h1;
      const p0 = project({ x, y: h0, z: z0 }, camera, view);
      const p1 = project({ x, y: h1, z: z1 }, camera, view);
      if (p0) top.push(p0);
      if (p1) bottom.push(p1);
    }
    if (top.length < 2 || bottom.length < 2) continue;
    ctx.fillStyle = groundColor(sumH / (xs.length * 2), z0 - camera.z);
    ctx.beginPath();
    ctx.moveTo(top[0].x, top[0].y);
    for (const p of top) ctx.lineTo(p.x, p.y);
    for (let i = bottom.length - 1; i >= 0; i--) ctx.lineTo(bottom[i].x, bottom[i].y);
    ctx.closePath();
    ctx.fill();

    // The river: a narrow blue ribbon across the band where it crosses
    // the valley, drawn a touch above the ground so it never z-fights.
    const rx0 = riverX(z0);
    const rx1 = riverX(z1);
    const a = project({ x: rx0 - 1.4, y: groundHeight(rx0, z0) + 0.4, z: z0 }, camera, view);
    const b = project({ x: rx0 + 1.4, y: groundHeight(rx0, z0) + 0.4, z: z0 }, camera, view);
    const c = project({ x: rx1 + 1.4, y: groundHeight(rx1, z1) + 0.4, z: z1 }, camera, view);
    const d = project({ x: rx1 - 1.4, y: groundHeight(rx1, z1) + 0.4, z: z1 }, camera, view);
    if (a && b && c && d) {
      ctx.fillStyle = '#4d9bd6';
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.lineTo(c.x, c.y);
      ctx.lineTo(d.x, d.y);
      ctx.closePath();
      ctx.fill();
    }

    // The runway: a grey strip with a dashed centreline where it runs.
    if (z0 >= CONFIG.runwayStartZ - 30 && z1 <= CONFIG.runwayEndZ + 30) {
      const w = CONFIG.runwayHalfWidth;
      const p = [
        project({ x: -w, y: 0.5, z: z0 }, camera, view),
        project({ x: w, y: 0.5, z: z0 }, camera, view),
        project({ x: w, y: 0.5, z: z1 }, camera, view),
        project({ x: -w, y: 0.5, z: z1 }, camera, view),
      ];
      if (p.every(Boolean)) {
        ctx.fillStyle = '#5b5f66';
        ctx.beginPath();
        ctx.moveTo(p[0].x, p[0].y);
        for (const q of p.slice(1)) ctx.lineTo(q.x, q.y);
        ctx.closePath();
        ctx.fill();
        // Centreline dash, only on every other band so it reads as dashes.
        if (Math.floor(z0 / 40) % 2 === 0) {
          const m0 = project({ x: -0.7, y: 0.7, z: z0 }, camera, view);
          const m1 = project({ x: 0.7, y: 0.7, z: z0 }, camera, view);
          const m2 = project({ x: 0.7, y: 0.7, z: z1 }, camera, view);
          const m3 = project({ x: -0.7, y: 0.7, z: z1 }, camera, view);
          if (m0 && m1 && m2 && m3) {
            ctx.fillStyle = '#f5f2e8';
            ctx.beginPath();
            ctx.moveTo(m0.x, m0.y);
            ctx.lineTo(m1.x, m1.y);
            ctx.lineTo(m2.x, m2.y);
            ctx.lineTo(m3.x, m3.y);
            ctx.closePath();
            ctx.fill();
          }
        }
      }
    }
  }

  // Pine trees, far to near, as simple two-tone triangles with a trunk.
  const visible = trees.filter((t) => t.z > camera.z + 4 && t.z < camera.z + CONFIG.viewDistance);
  for (const tree of visible) {
    const base = project({ x: tree.x, y: terrainHeight(tree.x, tree.z), z: tree.z }, camera, view);
    if (!base) continue;
    const h = tree.h * base.scale * 0.9;
    const w = tree.w * base.scale * 0.9;
    if (h < 1.5) continue;
    ctx.fillStyle = '#2c4a2e';
    ctx.beginPath();
    ctx.moveTo(base.x, base.y - h);
    ctx.lineTo(base.x - w, base.y);
    ctx.lineTo(base.x + w, base.y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#3f6b35';
    ctx.beginPath();
    ctx.moveTo(base.x, base.y - h);
    ctx.lineTo(base.x - w * 0.55, base.y - h * 0.28);
    ctx.lineTo(base.x + w * 0.55, base.y - h * 0.28);
    ctx.closePath();
    ctx.fill();
  }
}

// A golden ring, glowing when the plane is close, dimmed once flown through.
// The next unflown ring gets a small chevron above it, so the pilot always
// knows which ring to chase.
function drawRing(ctx, view, camera, ring, time, isNext) {
  const p = project({ x: ring.x, y: ring.y, z: ring.z }, camera, view);
  if (!p) return;
  const r = CONFIG.ringRadius * p.scale;
  if (r < 2) return;
  const pulse = 0.75 + 0.25 * Math.sin(time * 4 + ring.z);
  ctx.save();
  ctx.translate(p.x, p.y);
  if (!ring.passed) {
    ctx.shadowColor = 'rgba(255, 200, 60, 0.9)';
    ctx.shadowBlur = 18 * pulse;
    ctx.strokeStyle = '#ffc63d';
    ctx.lineWidth = Math.max(2, r * 0.16);
    ctx.beginPath();
    ctx.ellipse(0, 0, r, r * 0.92, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.lineWidth = Math.max(1, r * 0.05);
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.82, r * 0.75, 0, 0, Math.PI * 2);
    ctx.stroke();
    if (isNext) {
      ctx.fillStyle = `rgba(255, 255, 255, ${0.6 + 0.4 * pulse})`;
      ctx.beginPath();
      ctx.moveTo(0, -r - 16);
      ctx.lineTo(-9, -r - 30);
      ctx.lineTo(9, -r - 30);
      ctx.closePath();
      ctx.fill();
    }
  } else {
    ctx.strokeStyle = 'rgba(140, 220, 140, 0.75)';
    ctx.lineWidth = Math.max(1.5, r * 0.1);
    ctx.beginPath();
    ctx.ellipse(0, 0, r, r * 0.92, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

// The plane, seen from behind and slightly above: red fuselage, white wings,
// tail fin and a spinning propeller disc. It banks with the roll.
function drawPlane(ctx, view, plane, time) {
  const cx = view.width / 2;
  const cy = view.height * 0.66;
  const s = 1 + plane.speed / 240;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(plane.bank * 0.45);
  ctx.scale(s, s);

  // Propeller blur disc.
  const prop = 0.5 + 0.5 * Math.sin(time * 40);
  ctx.fillStyle = `rgba(220, 225, 230, ${0.16 + prop * 0.1})`;
  ctx.beginPath();
  ctx.ellipse(0, -6, 26, 30, 0, 0, Math.PI * 2);
  ctx.fill();

  // Wings.
  ctx.fillStyle = '#e8e4da';
  ctx.beginPath();
  ctx.moveTo(-78, 6);
  ctx.quadraticCurveTo(-40, -8, -14, 2);
  ctx.lineTo(-14, 12);
  ctx.quadraticCurveTo(-44, 16, -78, 12);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(78, 6);
  ctx.quadraticCurveTo(40, -8, 14, 2);
  ctx.lineTo(14, 12);
  ctx.quadraticCurveTo(44, 16, 78, 12);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#c33a2e';
  ctx.fillRect(-78, 6, 10, 4);
  ctx.fillRect(68, 6, 10, 4);

  // Tail.
  ctx.fillStyle = '#c33a2e';
  ctx.beginPath();
  ctx.moveTo(-6, -52);
  ctx.lineTo(6, -52);
  ctx.lineTo(10, -26);
  ctx.lineTo(-10, -26);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#e8e4da';
  ctx.fillRect(-26, -30, 52, 7);

  // Fuselage, tapering toward the nose.
  const body = ctx.createLinearGradient(-14, 0, 14, 0);
  body.addColorStop(0, '#a32a20');
  body.addColorStop(0.5, '#d84a35');
  body.addColorStop(1, '#a32a20');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-13, 22);
  ctx.quadraticCurveTo(-15, -30, -7, -56);
  ctx.lineTo(7, -56);
  ctx.quadraticCurveTo(15, -30, 13, 22);
  ctx.quadraticCurveTo(0, 30, -13, 22);
  ctx.closePath();
  ctx.fill();

  // Cockpit glass and mail stripe.
  ctx.fillStyle = '#bfe3f2';
  ctx.beginPath();
  ctx.ellipse(0, -30, 8, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f5f2e8';
  ctx.fillRect(-13, 2, 26, 5);

  // Navigation lights, blinking.
  if (Math.floor(time * 2) % 2 === 0) {
    ctx.fillStyle = '#ff4d4d';
    ctx.beginPath();
    ctx.arc(-78, 9, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4dff88';
    ctx.beginPath();
    ctx.arc(78, 9, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// Speed lines at high throttle, so velocity reads on screen.
function drawSpeedLines(ctx, view, plane, time) {
  if (plane.speed < 55) return;
  const n = Math.floor((plane.speed - 50) / 6);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < n; i++) {
    const seed = (i * 137 + Math.floor(time * 24) * 7) % 1000;
    const x = (seed * 1.37) % view.width;
    const y = (seed * 2.71) % view.height;
    const len = 14 + plane.speed * 0.35;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - len * 0.25, y + len);
    ctx.stroke();
  }
}

// One full frame: sky, ground, rings, plane, speed lines.
export function renderFrame(ctx, view, world) {
  const { camera, plane, mission, clouds, trees, time } = world;
  ctx.clearRect(0, 0, view.width, view.height);
  drawSky(ctx, view, camera, clouds, time);
  drawGround(ctx, view, camera, trees);
  const nextRing = mission.rings.find((r) => !r.passed);
  for (const ring of mission.rings) drawRing(ctx, view, camera, ring, time, ring === nextRing);
  drawPlane(ctx, view, plane, time);
  drawSpeedLines(ctx, view, plane, time);
  // A soft vignette so the frame reads as a cockpit view, not a flat canvas.
  const vignette = ctx.createRadialGradient(
    view.width / 2, view.height / 2, view.height * 0.45,
    view.width / 2, view.height / 2, view.height * 0.95,
  );
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, 'rgba(10, 20, 40, 0.32)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, view.width, view.height);
}
