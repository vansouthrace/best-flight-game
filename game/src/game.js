// Ridge Runner: Alpine Mail Run — the game itself.
// One job: own the loop and the screens (title, flying, landed, crashed),
// wire input, physics, rendering, HUD and sound together, and freeze one
// frame when the page opens with ?shot= so screenshots are real renders.

import { CONFIG } from './config.js';
import { newPlane, newMission, stepPlane, sortieScore } from './physics.js';
import { makeTrees, makeClouds, followCamera } from './terrain.js';
import { renderFrame } from './render.js';
import { drawHud, drawTitle, drawLanded, drawCrashed } from './hud.js';
import { makeAudio } from './audio.js';
import { makeInput } from './input.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = CONFIG.viewWidth;
canvas.height = CONFIG.viewHeight;

const view = {
  width: CONFIG.viewWidth,
  height: CONFIG.viewHeight,
  horizonY: Math.round(CONFIG.viewHeight * 0.42),
};

// The whole game state in one object, so the screenshot presets can stage it.
const game = {
  screen: 'title', // title | flying | landed | crashed
  plane: newPlane(),
  mission: newMission(0),
  camera: { x: 0, y: 8, z: -16 },
  trees: makeTrees(),
  clouds: makeClouds(),
  score: 0,
  time: 0, // game seconds since the page loaded
  sortieStart: 0,
  sortieTime: 0,
  lastBonus: 0,
  paused: false,
  frozen: false, // a ?shot= frame renders once and stops
};

const input = makeInput(canvas);
const audio = makeAudio();

// A read-only handle for play-testing from the console: window.__ridgeRunner
// exposes the live state (screen, plane, mission, score) and nothing else.
window.__ridgeRunner = game;

function resetRun() {
  game.plane = newPlane();
  game.mission = newMission(0);
  game.score = 0;
  game.sortieStart = game.time;
  game.sortieTime = 0;
  game.screen = 'flying';
}

function nextSortie() {
  const sortie = game.mission.sortie + 1;
  game.plane = newPlane();
  game.plane.z = 0;
  game.mission = newMission(sortie);
  game.sortieStart = game.time;
  game.sortieTime = 0;
  game.screen = 'flying';
}

// One frame: read the controls, step the world, paint it.
function frame(nowMs) {
  const now = nowMs / 1000;
  const dt = Math.min(0.05, Math.max(0.0001, now - (game.lastNow ?? now)));
  game.lastNow = now;
  game.time += dt;

  const actions = input.consume();
  if (actions.mute) audio.setMuted(!audio.muted);
  if (actions.pause && game.screen === 'flying') game.paused = !game.paused;
  if (actions.restart && game.screen !== 'title') resetRun();

  input.poll();
  if (game.screen === 'title' && actions.start) {
    audio.ensure();
    resetRun();
  } else if (game.screen === 'landed' && actions.start) {
    nextSortie();
  } else if (game.screen === 'crashed' && actions.restart) {
    resetRun();
  }

  if (game.screen === 'flying' && !game.paused) {
    game.sortieTime = game.time - game.sortieStart;
    const event = stepPlane(
      game.plane,
      game.mission,
      { pitch: input.pitch, bank: input.bank, throttle: input.throttle },
      dt,
      game.time,
    );
    followCamera(game.camera, game.plane, dt);
    audio.update(game.plane.throttle, game.plane.speed);
    if (event === 'ring') {
      game.score += CONFIG.ringPoints;
      audio.chime();
    } else if (event === 'hit') {
      audio.thud();
    } else if (event === 'crashed') {
      audio.thud();
      game.screen = 'crashed';
    } else if (event === 'landed') {
      // Rings were already added to the score as they were flown; the
      // landing bonus and time bonus are what a landing adds on top.
      game.lastBonus = sortieScore(game.mission, game.sortieTime) - game.mission.ringsHit * CONFIG.ringPoints;
      game.score += game.lastBonus;
      game.plane.fuel = CONFIG.fuelMax;
      audio.fanfare();
      game.screen = 'landed';
    }
  }

  // Paint the world, then the instruments and screens over it.
  renderFrame(ctx, view, {
    camera: game.camera,
    plane: game.plane,
    mission: game.mission,
    clouds: game.clouds,
    trees: game.trees,
    time: game.time,
  });
  if (game.screen === 'flying' || game.screen === 'landed') {
    drawHud(ctx, view, game.plane, game.mission, game.score, game.sortieTime, game.time);
  }
  if (game.screen === 'title') drawTitle(ctx, view);
  if (game.screen === 'landed') drawLanded(ctx, view, game.score, game.lastBonus);
  if (game.screen === 'crashed') drawCrashed(ctx, view, game.score);
  if (game.paused && game.screen === 'flying') {
    ctx.fillStyle = 'rgba(8, 14, 26, 0.55)';
    ctx.fillRect(0, 0, view.width, view.height);
    ctx.fillStyle = '#f4f8ff';
    ctx.font = '700 40px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED — press P to fly on', view.width / 2, view.height / 2);
    ctx.textAlign = 'left';
  }

  if (!game.frozen) requestAnimationFrame(frame);
}

// A ?shot= URL stages one frozen frame for screenshots; otherwise the game
// runs live from its title screen.
const shot = new URLSearchParams(window.location.search).get('shot');
if (shot && applyShot(shot, game)) {
  game.frozen = true;
  // The staged plane sits still, so render one frame at the staged time.
  renderFrame(ctx, view, {
    camera: game.camera,
    plane: game.plane,
    mission: game.mission,
    clouds: game.clouds,
    trees: game.trees,
    time: game.time,
  });
  if (game.screen === 'flying' || game.screen === 'landed') {
    drawHud(ctx, view, game.plane, game.mission, game.score, game.sortieTime, game.time);
  }
  if (game.screen === 'title') drawTitle(ctx, view);
  if (game.screen === 'landed') drawLanded(ctx, view, game.score, game.lastBonus);
} else {
  requestAnimationFrame(frame);
}
