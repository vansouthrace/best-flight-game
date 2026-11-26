// Ridge Runner: Alpine Mail Run — the cockpit instruments.
// One job: draw the HUD and the menu screens over the 3D view: altitude,
// speed, heading, fuel, damage, score, rings, and messages. The instruments
// are lit like a real panel, so they read in a screenshot.

import { CONFIG } from './config.js';
import { groundHeight } from './terrain.js';

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(12, 20, 34, 0.72)';
  ctx.strokeStyle = 'rgba(150, 200, 255, 0.45)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();
  ctx.stroke();
}

function label(ctx, text, x, y, size = 11) {
  ctx.fillStyle = '#9fc4e8';
  ctx.font = `600 ${size}px system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, x, y);
}

function value(ctx, text, x, y, size = 24) {
  ctx.fillStyle = '#f4f8ff';
  ctx.font = `700 ${size}px system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, x, y);
}

// A small artificial horizon: the sky/ground line tilts with the bank and
// slides with the pitch, like the real instrument.
function drawHorizon(ctx, cx, cy, r, plane) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(cx, cy);
  ctx.rotate(-plane.bank * 0.5);
  const dy = plane.pitch * 34;
  ctx.fillStyle = '#7fb2dd';
  ctx.fillRect(-r, -r + dy, r * 2, r - dy);
  ctx.fillStyle = '#7a5a38';
  ctx.fillRect(-r, dy, r * 2, r - dy + 1);
  ctx.strokeStyle = '#f4f8ff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-r, dy);
  ctx.lineTo(r, dy);
  ctx.stroke();
  ctx.rotate(plane.bank * 0.5);
  // Fixed wings: the plane's own mark stays level while the world tilts.
  ctx.fillStyle = '#ffcf3d';
  ctx.fillRect(-r + 8, -2, 18, 4);
  ctx.fillRect(r - 26, -2, 18, 4);
  ctx.beginPath();
  ctx.arc(0, 0, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(150, 200, 255, 0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
}

function headingText(heading) {
  const deg = ((heading * 180) / Math.PI % 360 + 360) % 360;
  const points = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const name = points[Math.round(deg / 45) % 8];
  return `${String(Math.round(deg)).padStart(3, '0')}° ${name}`;
}

export function drawHud(ctx, view, plane, mission, score, sortieTime, now) {
  const agl = Math.max(0, plane.y - groundHeight(plane.x, plane.z));

  // Top left: altitude, speed, heading.
  panel(ctx, 18, 16, 218, 108);
  label(ctx, 'ALTITUDE', 32, 40);
  value(ctx, `${Math.round(plane.y * 3)} ft`, 32, 66);
  label(ctx, `AGL ${Math.round(agl * 3)} ft`, 150, 40);
  label(ctx, 'AIRSPEED', 32, 92);
  value(ctx, `${Math.round(plane.speed * 2.2)} kt`, 32, 114, 20);
  label(ctx, headingText(plane.heading), 138, 114, 13);

  // Artificial horizon, top centre. The label sits under the dial so it
  // never overlaps the instrument itself.
  panel(ctx, view.width / 2 - 78, 16, 156, 108);
  drawHorizon(ctx, view.width / 2, 66, 38, plane);
  label(ctx, 'ATTITUDE', view.width / 2 - 30, 118, 10);

  // Top right: fuel, damage, score.
  panel(ctx, view.width - 236, 16, 218, 108);
  label(ctx, 'FUEL', view.width - 222, 40);
  const fuelW = 150;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.fillRect(view.width - 222, 50, fuelW, 12);
  ctx.fillStyle = plane.fuel < 25 ? '#ff5a4d' : '#7fd67f';
  ctx.fillRect(view.width - 222, 50, (fuelW * plane.fuel) / CONFIG.fuelMax, 12);
  value(ctx, `${Math.round(plane.fuel)}%`, view.width - 64, 62, 15);
  label(ctx, 'DAMAGE', view.width - 222, 88);
  for (let i = 0; i < CONFIG.maxDamage; i++) {
    ctx.fillStyle = i < plane.damage ? '#ff5a4d' : 'rgba(255, 255, 255, 0.25)';
    ctx.beginPath();
    ctx.arc(view.width - 212 + i * 22, 82, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  label(ctx, 'SCORE', view.width - 140, 88);
  value(ctx, String(score), view.width - 140, 114, 20);

  // Bottom centre: rings and the mission line.
  const ringsText = `RINGS  ${mission.ringsHit} / ${CONFIG.ringsPerSortie}    SORTIE ${mission.sortie + 1}`;
  ctx.font = '700 17px system-ui, sans-serif';
  const tw = ctx.measureText(ringsText).width;
  panel(ctx, view.width / 2 - tw / 2 - 18, view.height - 52, tw + 36, 36);
  ctx.fillStyle = '#f4f8ff';
  ctx.textAlign = 'center';
  ctx.fillText(ringsText, view.width / 2, view.height - 28);
  ctx.textAlign = 'left';

  // Sortie timer, bottom left.
  label(ctx, `TIME ${Math.floor(sortieTime / 60)}:${String(Math.floor(sortieTime % 60)).padStart(2, '0')}`, 24, view.height - 22, 13);

  // Transient centre message (ring scored, terrain strike). `now` and
  // messageUntil are both game seconds, so the message lasts as long as the
  // physics step said it should.
  if (mission.message && now < mission.messageUntil) {
    ctx.font = '700 26px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(12, 20, 34, 0.6)';
    const mw = ctx.measureText(mission.message).width;
    ctx.fillRect(view.width / 2 - mw / 2 - 16, view.height * 0.3 - 34, mw + 32, 44);
    ctx.fillStyle = '#ffd94d';
    ctx.fillText(mission.message, view.width / 2, view.height * 0.3 - 4);
    ctx.textAlign = 'left';
  }

  // Low-fuel warning.
  if (plane.fuel < 25 && plane.fuel > 0) {
    ctx.font = '700 18px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = Math.floor(performance.now() / 400) % 2 === 0 ? '#ff5a4d' : '#ffd94d';
    ctx.fillText('LOW FUEL — LAND ON THE RUNWAY', view.width / 2, view.height - 66);
    ctx.textAlign = 'left';
  }
}

function screenCard(ctx, view, lines, centerY = view.height / 2) {
  ctx.fillStyle = 'rgba(8, 14, 26, 0.55)';
  ctx.fillRect(0, 0, view.width, view.height);
  const w = 620;
  const h = 130 + lines.length * 34;
  const x = view.width / 2 - w / 2;
  const y = centerY - h / 2;
  ctx.fillStyle = 'rgba(12, 20, 34, 0.88)';
  ctx.strokeStyle = 'rgba(150, 200, 255, 0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 16);
  ctx.fill();
  ctx.stroke();
  ctx.textAlign = 'center';
  let cy = y + 58;
  for (const line of lines) {
    ctx.font = line.big ? '700 34px system-ui, sans-serif' : '400 18px system-ui, sans-serif';
    ctx.fillStyle = line.color ?? '#f4f8ff';
    ctx.fillText(line.text, view.width / 2, cy);
    cy += line.big ? 52 : 34;
  }
  ctx.textAlign = 'left';
}

export function drawTitle(ctx, view) {
  // The card rides high so the parked plane stays visible below it: the
  // title screen should show the aircraft, not hide it behind the menu.
  screenCard(ctx, view, [
    { text: 'RIDGE RUNNER', big: true, color: '#ffd94d' },
    { text: 'Alpine Mail Run — fly the rings, land the mail', color: '#cfe4f7' },
    { text: 'Arrows steer  •  A / D bank  •  W / S throttle  •  Mouse steers', color: '#9fc4e8' },
    { text: 'Land on the runway to refuel. Three hard hits end the run.', color: '#9fc4e8' },
    { text: 'Press ENTER or click to take off', color: '#ffd94d' },
  ], view.height * 0.32);
}

export function drawLanded(ctx, view, score, bonus) {
  screenCard(ctx, view, [
    { text: 'MAIL DELIVERED', big: true, color: '#7fd67f' },
    { text: `Sortie bonus +${bonus}   •   Total score ${score}`, color: '#cfe4f7' },
    { text: 'Tank refuelled. Press ENTER for the next sortie.', color: '#9fc4e8' },
  ], view.height * 0.36);
}

export function drawCrashed(ctx, view, score) {
  screenCard(ctx, view, [
    { text: 'AIRFRAME WRECKED', big: true, color: '#ff5a4d' },
    { text: `Final score ${score}`, color: '#cfe4f7' },
    { text: 'Press R to fly again', color: '#9fc4e8' },
  ], view.height * 0.36);
}
