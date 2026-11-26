// Ridge Runner: Alpine Mail Run — shared tuning and constants.
// One job: every number the rest of the game agrees on, in one place.

export const CONFIG = {
  // Canvas the game draws into (the page keeps it at this size).
  viewWidth: 1280,
  viewHeight: 720,

  // Flight model.
  maxSpeed: 95, // world units per second at full throttle
  minSpeed: 18, // below this the plane sinks
  cruiseSpeed: 55,
  climbRate: 26, // altitude units per second at full pitch up
  sinkRate: 14, // altitude lost per second when too slow
  turnRate: 0.6, // radians of heading per second at full bank
  maxBank: 0.9, // radians of visual bank
  maxPitch: 0.5,

  // Fuel: a full tank is 100. Throttle burns it; landing refuels.
  fuelMax: 100,
  fuelBurn: 2.6, // per second at full throttle
  fuelBurnIdle: 0.7, // per second at idle

  // Damage: three hard hits end the run.
  maxDamage: 3,

  // The valley.
  valleyHalfWidth: 150, // ground strips span this far each side
  mountainStart: 70, // |x| past this, the ground climbs into the peaks
  snowLine: 30, // terrain above this height is snow-capped
  viewDistance: 720, // how far ahead the ground is drawn

  // The mail run: rings per sortie, then the runway.
  ringsPerSortie: 8,
  ringSpacing: 300, // world units between rings
  ringRadius: 13,
  ringAltitude: 46, // rings float at a comfortable cruising height
  runwayStartZ: 2650, // the strip the pilot lands on
  runwayEndZ: 3050,
  runwayHalfWidth: 7,

  // Scoring.
  ringPoints: 100,
  landingBonus: 250,
  timeBonusPerSecond: 5,

  // Deterministic world seed, so every run and every screenshot shares
  // the same valley, river and trees.
  worldSeed: 20261126,
};

// A tiny deterministic PRNG (mulberry32): the world must look the same on
// every machine, every run, and in every screenshot.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
