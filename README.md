# GB Vel and the Shami Secret: PS2 test

Early-2000s PlayStation 2-style browser demo of the Shami clearing — native resolution, smooth shading, soft shadows, bloom, and original higher-poly models.

**Play:** https://thepodemail-lgtm.github.io/gb-vel-ps2/

Compare with the PS1-era sibling: https://thepodemail-lgtm.github.io/gb-vel-ps1/

Original content from Daniel’s *GB Vel* story. Models and textures are procedural / built from primitives. Era look only — no assets or names from any existing game.

## Controls

| Action | Keyboard | Touch |
|--------|----------|-------|
| Move | WASD / arrows | Left joystick |
| Attack | Z or J | ATTACK |
| Block | X or K | BLOCK |
| Pause | P | — |

## Tech

- Three.js **0.159.0** (jsDelivr) via ES modules + import map
- `UnrealBloomPass` from `three/addons/postprocessing/`
- Procedural canvas textures; instanced grass; soft shadow maps (blob fallback on mobile)
- Tweakables in `js/tuning.js`

## Local

Serve the folder over HTTP (modules need a server), e.g. `python3 -m http.server`.
