// Ridge Runner: Alpine Mail Run — screenshot presets.
// One job: when the page opens with ?shot=<name>, freeze the game in one
// exact, good-looking state so a headless browser can capture a real frame
// of the game. Nothing here changes how the game plays; it only stages it.
//
//   ?shot=start   title screen, plane parked on the runway at dawn
//   ?shot=ring    mid-flight, chasing the next golden ring over the river
//   ?shot=land    final approach, low over the runway threshold
//   ?shot=end     mail delivered, landed on the strip
//
// The frozen frame renders once and the loop stops, so every capture of the
// same shot is the same picture.

import { CONFIG } from './config.js';
import { newPlane } from './physics.js';

// A staged world for one shot: plane, camera and mission state, plus the
// screen the game should show (title / flying / landed).
export function applyShot(name, game) {
  const plane = newPlane();
  const mission = game.mission;
  const camera = game.camera;

  if (name === 'start') {
    // Parked on the runway, engine idling, dawn light on the valley.
    plane.x = 0;
    plane.y = 2;
    plane.z = CONFIG.runwayStartZ + 120;
    plane.throttle = 0.12;
    plane.speed = 0;
    camera.x = 0;
    camera.y = 9;
    camera.z = plane.z - 16;
    game.plane = plane;
    game.screen = 'title';
    game.time = 6;
    return true;
  }

  if (name === 'ring') {
    // Halfway through sortie one, banking toward the next ring with the
    // river below and two rings already flown. The plane sits just short
    // of the third ring so the gold ring fills the frame ahead.
    plane.x = -14;
    plane.y = 48;
    plane.z = 640;
    plane.heading = 0.12;
    plane.bank = 0.45;
    plane.pitch = 0.1;
    plane.throttle = 0.8;
    plane.speed = 78;
    plane.fuel = 71;
    mission.rings[0].passed = true;
    mission.rings[1].passed = true;
    mission.ringsHit = 2;
    // Nudge the third ring onto the plane's line so the shot reads as a
    // chase: the ring is the target, not a dot on the horizon.
    mission.rings[2].x = -6;
    mission.rings[2].y = 50;
    camera.x = -12;
    camera.y = 53;
    camera.z = plane.z - 16;
    game.plane = plane;
    game.screen = 'flying';
    game.time = 24;
    game.sortieTime = 24;
    return true;
  }

  if (name === 'land') {
    // On final approach: low, slow, lined up on the centreline, runway
    // ahead and the windsock side of the strip in view.
    plane.x = 2;
    plane.y = 12;
    plane.z = CONFIG.runwayStartZ - 180;
    plane.heading = 0;
    plane.bank = 0.05;
    plane.pitch = -0.12;
    plane.throttle = 0.35;
    plane.speed = 42;
    plane.fuel = 22;
    mission.rings.forEach((ring) => { ring.passed = true; });
    mission.ringsHit = CONFIG.ringsPerSortie;
    camera.x = 2;
    camera.y = 17;
    camera.z = plane.z - 16;
    game.plane = plane;
    game.screen = 'flying';
    game.time = 41;
    game.sortieTime = 41;
    return true;
  }

  if (name === 'end') {
    // Parked on the strip after delivery, mail handed over, tank full.
    plane.x = 0;
    plane.y = 2;
    plane.z = CONFIG.runwayStartZ + 260;
    plane.throttle = 0;
    plane.speed = 0;
    plane.fuel = CONFIG.fuelMax;
    mission.rings.forEach((ring) => { ring.passed = true; });
    mission.ringsHit = CONFIG.ringsPerSortie;
    mission.state = 'landed';
    camera.x = 0;
    camera.y = 9;
    camera.z = plane.z - 16;
    game.plane = plane;
    game.screen = 'landed';
    game.score = 1050;
    game.lastBonus = 850;
    game.time = 58;
    game.sortieTime = 58;
    return true;
  }

  return false;
}
