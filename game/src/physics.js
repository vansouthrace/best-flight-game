// Ridge Runner: Alpine Mail Run — flight model and mission rules.
// One job: move the plane, burn fuel, score rings, and decide when the
// pilot has landed, crashed, or finished a sortie.

import { CONFIG, mulberry32 } from './config.js';
import { groundHeight, onRunway } from './terrain.js';

export function newPlane() {
  return {
    x: 0,
    y: 14,
    z: 0,
    heading: 0, // radians; 0 is straight down the valley
    speed: 0,
    throttle: 0.55,
    pitch: 0, // -1 (down) .. 1 (up), smoothed
    bank: 0, // -1 (left) .. 1 (right), smoothed
    fuel: CONFIG.fuelMax,
    damage: 0,
  };
}

// A sortie is eight golden rings strung down the valley, then the runway.
// Ring positions are seeded per sortie so no two sorties fly the same line.
export function makeRings(sortie) {
  const rand = mulberry32(CONFIG.worldSeed + sortie * 7919);
  const rings = [];
  for (let i = 0; i < CONFIG.ringsPerSortie; i++) {
    rings.push({
      x: (rand() * 2 - 1) * 34,
      y: CONFIG.ringAltitude + (rand() * 2 - 1) * 16,
      z: 220 + i * CONFIG.ringSpacing + rand() * 60,
      passed: false,
    });
  }
  return rings;
}

export function newMission(sortie) {
  return {
    sortie,
    rings: makeRings(sortie),
    ringsHit: 0,
    startedAt: 0,
    state: 'flying', // flying | landed | crashed | done
    message: '',
    messageUntil: 0,
  };
}

// Steer the plane for one step. `ctl` is { pitch, bank, throttle } with each
// value in -1..1 (throttle 0..1). Returns an event string or null.
export function stepPlane(plane, mission, ctl, dt, now) {
  // Smooth the stick: the plane answers at once but never snaps.
  plane.pitch += (ctl.pitch - plane.pitch) * Math.min(1, dt * 6);
  plane.bank += (ctl.bank - plane.bank) * Math.min(1, dt * 6);
  plane.throttle = Math.max(0, Math.min(1, ctl.throttle));

  // Speed follows the throttle; too slow and the plane sinks.
  const targetSpeed = CONFIG.minSpeed + plane.throttle * (CONFIG.maxSpeed - CONFIG.minSpeed);
  plane.speed += (targetSpeed - plane.speed) * Math.min(1, dt * 1.4);

  // Banking turns the heading; pitching climbs or dives.
  plane.heading += plane.bank * CONFIG.turnRate * (plane.speed / CONFIG.maxSpeed) * dt;
  plane.x += Math.sin(plane.heading) * plane.speed * dt;
  plane.z += Math.cos(plane.heading) * plane.speed * dt;
  plane.y += plane.pitch * CONFIG.climbRate * dt;
  if (plane.speed < 32) {
    plane.y -= CONFIG.sinkRate * (1 - plane.speed / 32) * dt;
  }
  // The valley walls push back: the pilot cannot fly through a mountain.
  plane.x = Math.max(-140, Math.min(140, plane.x));
  // No absolute altitude floor: the ground check below decides what a
  // touchdown means. (A floor of y=2 would sit above the landing threshold
  // and make every landing impossible.)

  // Fuel burns with the throttle; an empty tank means gliding home.
  const burn = CONFIG.fuelBurnIdle + plane.throttle * CONFIG.fuelBurn;
  plane.fuel = Math.max(0, plane.fuel - burn * dt);
  if (plane.fuel <= 0 && plane.throttle > 0.25) plane.throttle = 0.25;

  // Rings: crossing a ring's plane inside its radius scores it. The window
  // is a few units either side of the ring so a fast plane cannot skip it.
  for (const ring of mission.rings) {
    if (ring.passed) continue;
    const dz = plane.z - ring.z;
    if (dz >= -5 && dz <= 5) {
      const dx = plane.x - ring.x;
      const dy = plane.y - ring.y;
      if (Math.hypot(dx, dy) <= CONFIG.ringRadius) {
        ring.passed = true;
        mission.ringsHit++;
        mission.message = `Ring ${mission.ringsHit} of ${CONFIG.ringsPerSortie} — +${CONFIG.ringPoints}`;
        mission.messageUntil = now + 1.6;
        return 'ring';
      }
    }
  }

  // The ground: a gentle touchdown on the strip is a landing; anything else
  // is a hard hit that costs damage and bounces the pilot back into the air.
  const ground = groundHeight(plane.x, plane.z);
  if (plane.y <= ground + 1.5) {
    const gentle = onRunway(plane.x, plane.z) && plane.speed < 46 && Math.abs(plane.pitch) < 0.45;
    if (gentle) {
      plane.y = ground + 1.5;
      mission.state = 'landed';
      return 'landed';
    }
    plane.damage++;
    plane.y = ground + 9;
    plane.speed *= 0.45;
    plane.pitch = 0.35;
    mission.message = plane.damage >= CONFIG.maxDamage ? 'Airframe wrecked!' : 'Terrain strike! Damage +1';
    mission.messageUntil = now + 2;
    if (plane.damage >= CONFIG.maxDamage) {
      mission.state = 'crashed';
      return 'crashed';
    }
    return 'hit';
  }
  return null;
}

// Score for a finished sortie: rings, a landing bonus, and a time bonus.
export function sortieScore(mission, elapsedSeconds) {
  const rings = mission.ringsHit * CONFIG.ringPoints;
  const landing = mission.state === 'landed' ? CONFIG.landingBonus : 0;
  const time = mission.state === 'landed' ? Math.max(0, Math.round(120 - elapsedSeconds)) * CONFIG.timeBonusPerSecond : 0;
  return rings + landing + time;
}
