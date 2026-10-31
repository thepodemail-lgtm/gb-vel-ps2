'use strict';
import * as THREE from 'three';
import { TUNING } from './tuning.js';
import { makeGrassTex, makeDirtTex, makeStoneTex, makeBarkTex, makeClothTex, makeLeafTex } from './textures.js';

/* Higher-poly smooth-shaded originals. Era look only — no ripped assets. */

const C = {
  skin: 0xc48a5c, hair: 0x1a1210, cloth: 0x8b1e1e, scarf: 0xc42828,
  metal: 0xc8d0d8, wood: 0x6b4423, shield: 0xd4a84b, gold: 0xd4b050,
  armor: 0xb8a878, dogFur: 0xd8d0c4, dogEar: 0xb8a090,
  demon: 0x4a6b3a, demonDark: 0x2a3a22, horn: 0xe8d8a0, eye: 0xff4422,
};

let TEX = null;
function tex() {
  if (!TEX) {
    TEX = {
      grass: makeGrassTex(), dirt: makeDirtTex(), stone: makeStoneTex(),
      bark: makeBarkTex(), cloth: makeClothTex(C.cloth), scarf: makeClothTex(C.scarf),
      leaf: makeLeafTex(), armor: makeClothTex(C.armor),
    };
    TEX.grass.repeat.set(8, 8);
    TEX.dirt.repeat.set(3, 3);
    TEX.stone.repeat.set(2, 2);
    TEX.bark.repeat.set(1, 2);
  }
  return TEX;
}

function mat(color, map, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color: map ? 0xffffff : color,
    map: map || null,
    roughness: opts.roughness ?? 0.72,
    metalness: opts.metalness ?? 0.05,
    flatShading: false,
    ...opts,
  });
}

function box(w, h, d, color, map, opts) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d, 1, 1, 1), mat(color, map, opts));
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
function cyl(rt, rb, h, seg, color, map, opts) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 10), mat(color, map, opts));
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
function sph(r, wseg, hseg, color, map, opts) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, wseg || 12, hseg || 10), mat(color, map, opts));
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
function capsuleLimb(r, len, color) {
  /* Rounder limb: cylinder + end spheres */
  const g = new THREE.Group();
  const mid = cyl(r, r, len, 10, color);
  mid.position.y = -len / 2;
  g.add(mid);
  const top = sph(r * 1.05, 10, 8, color);
  top.position.y = 0;
  g.add(top);
  const bot = sph(r * 1.05, 10, 8, color);
  bot.position.y = -len;
  g.add(bot);
  return g;
}

function lerpPose(parts, from, to, a) {
  for (const k of Object.keys(to)) {
    const p = parts[k];
    if (!p || !p.rotation) continue;
    const f = from[k] || { x: 0, y: 0, z: 0 };
    const t = to[k];
    p.rotation.x = f.x + (t.x - f.x) * a;
    p.rotation.y = f.y + (t.y - f.y) * a;
    p.rotation.z = f.z + (t.z - f.z) * a;
  }
}

/* ---- Vel ---- */
export function makeVel() {
  const T = tex();
  const root = new THREE.Group();
  root.name = 'vel';

  const hips = box(0.42, 0.2, 0.28, C.cloth, T.cloth);
  hips.position.y = 0.78;
  root.add(hips);

  const torso = box(0.44, 0.58, 0.3, C.cloth, T.cloth);
  torso.position.y = 1.12;
  root.add(torso);

  /* Armor chest piece */
  const armor = box(0.46, 0.28, 0.32, C.armor, T.armor, { metalness: 0.25, roughness: 0.45 });
  armor.position.y = 1.28;
  root.add(armor);

  /* Cloth sash */
  const sash = box(0.5, 0.1, 0.34, C.scarf, T.scarf);
  sash.position.y = 0.95;
  root.add(sash);
  const sashTail = box(0.12, 0.45, 0.04, C.scarf, T.scarf);
  sashTail.position.set(0.22, 0.72, 0.16);
  sashTail.rotation.z = 0.2;
  root.add(sashTail);

  const scarf = box(0.5, 0.14, 0.34, C.scarf, T.scarf);
  scarf.position.y = 1.42;
  root.add(scarf);

  /* Head with simple face + hair */
  const head = sph(0.2, 14, 12, C.skin);
  head.position.y = 1.68;
  root.add(head);
  const hair = sph(0.22, 12, 10, C.hair);
  hair.position.y = 1.78;
  hair.scale.set(1, 0.7, 1.05);
  root.add(hair);
  const bang = box(0.28, 0.08, 0.12, C.hair);
  bang.position.set(0, 1.78, 0.14);
  root.add(bang);
  /* Eyes */
  const eyeL = sph(0.035, 6, 5, 0x1a1010);
  eyeL.position.set(-0.07, 1.70, 0.16);
  eyeL.castShadow = false;
  root.add(eyeL);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.07;
  root.add(eyeR);
  const brow = box(0.2, 0.03, 0.04, C.hair);
  brow.position.set(0, 1.76, 0.17);
  root.add(brow);

  const Larm = capsuleLimb(0.075, 0.44, C.skin);
  Larm.position.set(-0.32, 1.36, 0);
  root.add(Larm);
  const Rarm = capsuleLimb(0.075, 0.44, C.skin);
  Rarm.position.set(0.32, 1.36, 0);
  root.add(Rarm);

  const Lleg = capsuleLimb(0.09, 0.58, C.cloth);
  Lleg.position.set(-0.13, 0.72, 0);
  root.add(Lleg);
  const Rleg = capsuleLimb(0.09, 0.58, C.cloth);
  Rleg.position.set(0.13, 0.72, 0);
  root.add(Rleg);

  /* Sword */
  const sword = new THREE.Group();
  const blade = box(0.05, 0.78, 0.09, C.metal, null, { metalness: 0.7, roughness: 0.28 });
  blade.position.y = -0.4;
  sword.add(blade);
  const hilt = cyl(0.04, 0.04, 0.16, 8, C.wood, T.bark);
  hilt.position.y = 0.02;
  sword.add(hilt);
  const guard = box(0.24, 0.04, 0.08, C.gold, null, { metalness: 0.6, roughness: 0.35 });
  guard.position.y = -0.06;
  sword.add(guard);
  sword.position.set(0, -0.44, 0);
  Rarm.add(sword);

  /* Shield */
  const shield = new THREE.Group();
  const plate = cyl(0.3, 0.3, 0.06, 12, C.shield, null, { metalness: 0.35, roughness: 0.4 });
  plate.rotation.x = Math.PI / 2;
  shield.add(plate);
  const boss = sph(0.08, 8, 6, C.gold, null, { metalness: 0.6, roughness: 0.3 });
  boss.position.z = 0.05;
  shield.add(boss);
  const rim = cyl(0.31, 0.31, 0.04, 12, C.gold, null, { metalness: 0.5, roughness: 0.35 });
  rim.rotation.x = Math.PI / 2;
  shield.add(rim);
  shield.position.set(0, -0.38, 0.2);
  Larm.add(shield);

  root.userData.parts = { torso, head, Larm, Rarm, Lleg, Rleg, sword, shield, hips };
  root.userData.blend = { idle: 1, walk: 0, attack: 0, block: 0 };
  root.userData.attackPhase = 0;
  return root;
}

function poseWeights(blend, phase, attackPhase) {
  const idle = {
    Larm: { x: 0.05, y: 0, z: 0.18 }, Rarm: { x: 0.05, y: 0, z: -0.18 },
    Lleg: { x: 0, y: 0, z: 0 }, Rleg: { x: 0, y: 0, z: 0 },
    torso: { x: 0, y: 0, z: 0 }, sword: { x: 0, y: 0, z: 0 }, shield: { x: 0, y: 0, z: 0 },
  };
  const s = Math.sin(phase);
  const walk = {
    Larm: { x: -s * 0.55, y: 0, z: 0.12 }, Rarm: { x: s * 0.55, y: 0, z: -0.12 },
    Lleg: { x: s * 0.7, y: 0, z: 0 }, Rleg: { x: -s * 0.7, y: 0, z: 0 },
    torso: { x: 0, y: s * 0.04, z: 0 }, sword: { x: 0, y: 0, z: 0 }, shield: { x: 0, y: 0, z: 0 },
  };
  const a = attackPhase;
  const swing = a < 0.35 ? (a / 0.35) * -1.9 : -1.9 + ((a - 0.35) / 0.65) * 2.7;
  const attack = {
    Larm: { x: -0.3, y: 0, z: 0.2 }, Rarm: { x: swing, y: a < 0.5 ? a * 1.2 : (1 - a) * 1.2, z: -0.1 },
    Lleg: { x: 0.15, y: 0, z: 0 }, Rleg: { x: -0.1, y: 0, z: 0 },
    torso: { x: 0, y: (a - 0.5) * 0.55, z: 0 }, sword: { x: 0, y: 0, z: -0.35 }, shield: { x: 0, y: 0, z: 0 },
  };
  const block = {
    Larm: { x: -1.15, y: 0.55, z: 0.1 }, Rarm: { x: -0.45, y: 0, z: -0.2 },
    Lleg: { x: 0.1, y: 0, z: 0 }, Rleg: { x: 0.05, y: 0, z: 0 },
    torso: { x: 0, y: 0.22, z: 0 }, sword: { x: 0, y: 0, z: 0 }, shield: { x: 0, y: -0.35, z: 0 },
  };
  /* Weighted blend of the four poses */
  const keys = ['Larm', 'Rarm', 'Lleg', 'Rleg', 'torso', 'sword', 'shield'];
  const out = {};
  const poses = [
    [idle, blend.idle], [walk, blend.walk], [attack, blend.attack], [block, blend.block],
  ];
  for (const k of keys) {
    out[k] = { x: 0, y: 0, z: 0 };
    let wsum = 0;
    for (const [pose, w] of poses) {
      if (w <= 0.001) continue;
      out[k].x += pose[k].x * w;
      out[k].y += pose[k].y * w;
      out[k].z += pose[k].z * w;
      wsum += w;
    }
    if (wsum > 0) { out[k].x /= wsum; out[k].y /= wsum; out[k].z /= wsum; }
  }
  return out;
}

export function poseVel(root, targetState, t, dt) {
  const p = root.userData.parts;
  const b = root.userData.blend;
  if (!p || !b) return;
  const speeds = {
    idle: TUNING.animBlendIdle, walk: TUNING.animBlendWalk,
    attack: TUNING.animBlendAttack, block: TUNING.animBlendBlock,
  };
  const targets = { idle: 0, walk: 0, attack: 0, block: 0 };
  targets[targetState] = 1;
  for (const k of Object.keys(b)) {
    const sp = speeds[k] || 6;
    b[k] += (targets[k] - b[k]) * Math.min(1, sp * (dt || 0.016));
  }
  if (targetState === 'attack') root.userData.attackPhase = t;
  const pose = poseWeights(b, t * (b.walk > 0.3 ? 9 : 2), root.userData.attackPhase || 0);
  for (const k of Object.keys(pose)) {
    if (p[k]) {
      p[k].rotation.x = pose[k].x;
      p[k].rotation.y = pose[k].y;
      p[k].rotation.z = pose[k].z;
    }
  }
  /* Idle breathe */
  if (p.torso) p.torso.position.y = 1.12 + Math.sin(t * 2) * 0.012 * b.idle;
  if (b.walk > 0.2 && p.hips) p.hips.position.y = 0.78 + Math.abs(Math.sin(t * 9)) * 0.025 * b.walk;
}

/* ---- Dog ---- */
export function makeDog() {
  const root = new THREE.Group();
  const body = sph(0.28, 12, 10, C.dogFur);
  body.scale.set(1.35, 0.85, 0.95);
  body.position.y = 0.34;
  root.add(body);
  const head = sph(0.18, 12, 10, C.dogFur);
  head.position.set(0.34, 0.42, 0);
  root.add(head);
  const snout = sph(0.1, 10, 8, C.dogEar);
  snout.scale.set(1.2, 0.8, 0.9);
  snout.position.set(0.48, 0.36, 0);
  root.add(snout);
  const earL = sph(0.07, 8, 6, C.dogEar);
  earL.scale.set(0.6, 1.3, 0.4);
  earL.position.set(0.3, 0.56, 0.1);
  root.add(earL);
  const earR = earL.clone();
  earR.position.z = -0.1;
  root.add(earR);
  const eyeL = sph(0.03, 6, 5, 0x221810);
  eyeL.position.set(0.42, 0.46, 0.1);
  eyeL.castShadow = false;
  root.add(eyeL);
  const eyeR = eyeL.clone();
  eyeR.position.z = -0.1;
  root.add(eyeR);
  const tail = cyl(0.04, 0.025, 0.32, 8, C.dogFur);
  tail.position.set(-0.34, 0.42, 0);
  tail.rotation.z = 1.1;
  root.add(tail);
  [[0.16, 0.1], [0.16, -0.1], [-0.14, 0.1], [-0.14, -0.1]].forEach(([x, z]) => {
    const leg = cyl(0.045, 0.04, 0.24, 8, C.dogFur);
    leg.position.set(x, 0.12, z);
    root.add(leg);
  });
  root.userData.tail = tail;
  root.userData.head = head;
  return root;
}

export function poseDog(root, t, biting) {
  if (root.userData.tail) root.userData.tail.rotation.y = Math.sin(t * 8) * 0.5;
  if (biting && root.userData.head) root.userData.head.position.y = 0.42 + Math.sin(t * 20) * 0.04;
}

/* ---- Demons ---- */
export function makeDemon(kind) {
  const T = tex();
  const root = new THREE.Group();
  const scale = kind === 0 ? 1.2 : kind === 1 ? 1.05 : 0.95;
  root.scale.setScalar(scale);
  const bodyCol = kind === 0 ? C.demon : kind === 1 ? 0x5a3a6a : 0x6a4a2a;

  const torso = sph(0.38, 12, 10, bodyCol);
  torso.scale.set(1.1, 1.35, 0.9);
  torso.position.y = 1.2;
  root.add(torso);

  const head = sph(0.28, 12, 10, bodyCol);
  head.position.y = 1.78;
  root.add(head);

  const h1 = cyl(0.04, 0.01, 0.32, 7, C.horn);
  h1.position.set(-0.14, 2.05, 0);
  h1.rotation.z = 0.4;
  root.add(h1);
  const h2 = h1.clone();
  h2.position.x = 0.14;
  h2.rotation.z = -0.4;
  root.add(h2);

  const eyeL = sph(0.05, 8, 6, C.eye);
  eyeL.position.set(-0.1, 1.8, 0.22);
  eyeL.castShadow = false;
  root.add(eyeL);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.1;
  root.add(eyeR);

  const armL = capsuleLimb(0.09, 0.5, bodyCol);
  armL.position.set(-0.42, 1.35, 0);
  root.add(armL);
  const armR = capsuleLimb(0.09, 0.5, bodyCol);
  armR.position.set(0.42, 1.35, 0);
  root.add(armR);

  const weapon = cyl(0.06, 0.1, 0.7, 8, C.wood, T.bark);
  weapon.position.set(0.42, 0.9, 0.15);
  root.add(weapon);

  const legL = capsuleLimb(0.1, 0.55, C.demonDark);
  legL.position.set(-0.15, 0.55, 0);
  root.add(legL);
  const legR = capsuleLimb(0.1, 0.55, C.demonDark);
  legR.position.set(0.15, 0.55, 0);
  root.add(legR);

  if (kind === 2) {
    const tusk = cyl(0.03, 0.01, 0.2, 6, C.horn);
    tusk.position.set(-0.1, 1.62, 0.22);
    tusk.rotation.x = 1.1;
    root.add(tusk);
    const tusk2 = tusk.clone();
    tusk2.position.x = 0.1;
    root.add(tusk2);
  }

  root.userData.arms = [armL, armR];
  root.userData.legs = [legL, legR];
  root.userData.weapon = weapon;
  root.userData.kind = kind;
  return root;
}

export function poseDemon(root, t, attacking) {
  const legs = root.userData.legs;
  const arms = root.userData.arms;
  if (legs) {
    const s = Math.sin(t * 6);
    legs[0].rotation.x = s * 0.4;
    legs[1].rotation.x = -s * 0.4;
  }
  if (attacking && arms) {
    arms[1].rotation.x = -1.2 + Math.sin(t * 14) * 0.3;
  } else if (arms) {
    arms[0].rotation.x = Math.sin(t * 3) * 0.2;
    arms[1].rotation.x = -Math.sin(t * 3) * 0.2;
  }
}

/* ---- World pieces ---- */
export function makeShamiTree() {
  const T = tex();
  const root = new THREE.Group();
  const trunk = cyl(0.38, 0.55, 2.6, 12, 0xffffff, T.bark);
  trunk.position.y = 1.3;
  root.add(trunk);
  const br = cyl(0.12, 0.2, 1.8, 10, 0xffffff, T.bark);
  br.position.set(0.7, 2.4, 0.1);
  br.rotation.z = -1.05;
  root.add(br);
  const br2 = cyl(0.1, 0.16, 1.4, 10, 0xffffff, T.bark);
  br2.position.set(-0.6, 2.6, 0.25);
  br2.rotation.z = 0.95;
  root.add(br2);
  const br3 = cyl(0.08, 0.12, 1.1, 8, 0xffffff, T.bark);
  br3.position.set(0.2, 2.9, -0.5);
  br3.rotation.x = 0.7;
  root.add(br3);
  const spots = [
    [0, 3.3, 0, 1.5], [1.0, 2.9, 0.2, 1.1], [-0.9, 3.0, -0.2, 1.1],
    [0.4, 3.6, -0.5, 1.0], [-0.5, 3.5, 0.5, 0.95], [1.3, 2.5, 0, 0.8],
    [-0.2, 3.8, 0.1, 0.85], [0.6, 3.1, 0.7, 0.7],
  ];
  spots.forEach(([x, y, z, r]) => {
    const leaf = sph(r, 10, 8, 0xffffff, T.leaf);
    leaf.position.set(x, y, z);
    root.add(leaf);
  });
  return root;
}

export function makeRuinPillar() {
  const T = tex();
  const g = new THREE.Group();
  const col = cyl(0.3, 0.34, 2.4, 12, 0xffffff, T.stone);
  col.position.y = 1.2;
  g.add(col);
  const flutes = cyl(0.28, 0.28, 2.2, 12, 0x9a9688);
  flutes.position.y = 1.2;
  flutes.material.transparent = true;
  flutes.material.opacity = 0.35;
  flutes.castShadow = false;
  g.add(flutes);
  const cap = box(0.75, 0.22, 0.75, 0xffffff, T.stone);
  cap.position.y = 2.45;
  g.add(cap);
  const base = box(0.75, 0.2, 0.75, 0xffffff, T.stone);
  base.position.y = 0.1;
  g.add(base);
  return g;
}

export function makeRuinWall() {
  const T = tex();
  const g = new THREE.Group();
  const wall = box(2.6, 1.5, 0.4, 0xffffff, T.stone);
  wall.position.y = 0.75;
  g.add(wall);
  const broke = box(0.9, 0.7, 0.4, 0xffffff, T.stone);
  broke.position.set(1.1, 1.6, 0);
  broke.rotation.z = -0.28;
  g.add(broke);
  return g;
}

export function makeGround() {
  const T = tex();
  const g = new THREE.Group();
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(TUNING.arenaRadius + 1.2, 48),
    mat(0xffffff, T.grass, { roughness: 0.9 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  g.add(floor);
  const dirt = new THREE.Mesh(
    new THREE.RingGeometry(2.0, 4.8, 32),
    mat(0xffffff, T.dirt, { roughness: 0.95 })
  );
  dirt.rotation.x = -Math.PI / 2;
  dirt.position.y = 0.015;
  dirt.receiveShadow = true;
  g.add(dirt);
  return g;
}

export function makeTreeBorder(n) {
  const T = tex();
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = TUNING.arenaRadius + 1.6 + (i % 3) * 0.5;
    const t = new THREE.Group();
    const tr = cyl(0.22 + (i % 3) * 0.04, 0.3, 2.0 + (i % 4) * 0.35, 10, 0xffffff, T.bark);
    tr.position.y = 1.0;
    t.add(tr);
    const top = sph(1.0 + (i % 3) * 0.15, 10, 8, 0xffffff, T.leaf);
    top.position.y = 2.4;
    t.add(top);
    const top2 = sph(0.7, 8, 6, 0xffffff, T.leaf);
    top2.position.set(0.4, 2.6, 0.2);
    t.add(top2);
    t.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    g.add(t);
  }
  return g;
}

export function makeBlobShadow() {
  const m = new THREE.Mesh(
    new THREE.CircleGeometry(0.45, 16),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false })
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.03;
  m.renderOrder = 1;
  return m;
}

export { C, tex };
