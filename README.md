# Ridge Runner — Alpine Mail Run

[![make.fun competition](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![make.fun rank](https://make.fun/badge/best-flight-game-20261126-0057/vansouthrace/best-flight-game/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![make.fun reward](https://make.fun/badge/best-flight-game-20261126-0057/vansouthrace/best-flight-game/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)

A [make.fun](https://make.fun/bounty/best-flight-game-20261126-0057) entry: a complete flight game that runs in a desktop browser from static files alone — no build step, no network requests, no libraries.

You are a bush pilot on the alpine mail run. Fly the golden rings down the valley, then land on the runway to deliver the mail and refuel. Fuel burns with the throttle, three hard hits wreck the airframe, and every sortie pays a landing bonus plus a time bonus — so throttle discipline and clean landings beat flat-out speed. Only 6 entrants were in when this was built, for a $500 prize pool: this is the serious entry of the batch.

## The game

- **Chase view** over a procedural alpine valley: layered ridges, snow caps, a winding river, pine forests, and a dawn sun on the horizon.
- **Real flight model**: pitch, bank, heading, speed, sink when slow, and terrain collision with damage.
- **Missions**: 8 golden rings per sortie in a fresh seeded line, then a runway landing. Landings refuel; the next sortie flies a new ring line.
- **Instruments, lit**: altitude and AGL, airspeed, heading compass, artificial horizon, fuel gauge, damage lights, score, ring counter and sortie timer — all on a live HUD.
- **Sound, synthesized live** (WebAudio, no audio files): an engine hum that follows the throttle, wind that follows the speed, a ring chime, a crash thud and a landing fanfare.
- **Controls**: arrows steer, A/D bank, W/S throttle, mouse steers, wheel throttles, Enter takes off, R restarts, P pauses, M mutes.

## Run it

Serve `game/` with any static server and open it in desktop Chrome:

```sh
cd game && python3 -m http.server 8080
# open http://localhost:8080
```

Or open `game/index.html` directly from disk — the game loads nothing over the network.

Screenshots are real renders of the game: open `?shot=start`, `?shot=ring`, `?shot=land` or `?shot=end` to stage one frozen frame each.

## Hand it in

`main.ts` (Node 22, standard library only) copies `game/` and `screenshots/` to `/output` and writes `/output/dossier.json` with the vendored `vendor/makefun-game.ts` library:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Files

- `game/index.html`, `game/style.css` — the page
- `game/src/game.js` — the loop and the screens
- `game/src/config.js` — tuning and the deterministic world seed
- `game/src/terrain.js` — valley, river, runway, camera projection, trees
- `game/src/physics.js` — flight model, rings, landings, crashes, scoring
- `game/src/render.js` — sky, ground, rings, plane, speed lines
- `game/src/hud.js` — instruments and menu screens
- `game/src/audio.js` — synthesized engine, wind and effects
- `game/src/input.js` — keyboard and mouse
- `game/src/shots.js` — frozen screenshot presets (`?shot=`)
