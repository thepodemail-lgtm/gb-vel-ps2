'use strict';
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { TUNING } from './tuning.js';
import { AudioFX } from './audio.js';
import { Input } from './input.js';
import * as Models from './models.js';
import { makeSkyCubemap } from './textures.js';

(function () {
  let renderer, scene, camera, clock, composer, bloomPass;
  let vel, dog, enemies = [];
  let state = 'title';
  let velHp = TUNING.velMaxHp;
  let invuln = 0, atkT = 0, atkCd = 0, blocking = false;
  let animT = 0, dogBiteCd = 0, dogBarkT = 0, dogBiting = false;
  let msgT = 0, muted = false, started = false;
  let useBlobShadows = TUNING.preferBlobShadows;
  let sparks = [];
  let trailPts = [];
  let trailLine = null;
  let blobShadows = [];
  let sun = null;

  const hudEl = () => document.getElementById('hud');
  const titleEl = () => document.getElementById('title-overlay');
  const pauseEl = () => document.getElementById('pause-overlay');
  const msgEl = () => document.getElementById('msg');

  function showMsg(text, sec) {
    const el = msgEl();
    el.textContent = text;
    el.style.opacity = '1';
    msgT = sec || 2.5;
  }
  function heartsStr() {
    let s = '';
    for (let i = 0; i < TUNING.velMaxHp; i++) s += i < velHp ? '♥' : '♡';
    return s;
  }
  function updateHUD() {
    const el = hudEl();
    if (!el) return;
    el.innerHTML = (state === 'play' || state === 'pause')
      ? `<div style="color:#e84848">${heartsStr()}</div><div style="font-size:12px;opacity:.85;margin-top:4px">GB VEL — SHAMI CLEARING (PS2)</div>`
      : '';
  }

  function makeRenderer() {
    const canvas = document.getElementById('game');
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = !useBlobShadows;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    resize();
  }

  function resize() {
    if (!renderer) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const pr = Math.min(window.devicePixelRatio || 1, TUNING.maxPixelRatio);
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    if (camera) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    if (composer) {
      composer.setSize(w, h);
      bloomPass.resolution.set(w, h);
    }
  }

  function makeSky() {
    const geo = new THREE.SphereGeometry(80, 24, 16);
    const tex = makeSkyCubemap();
    tex.mapping = THREE.EquirectangularReflectionMapping;
    const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, depthWrite: false });
    const sky = new THREE.Mesh(geo, mat);
    sky.name = 'sky';
    return sky;
  }

  function addInstancedGrass() {
    const blade = new THREE.PlaneGeometry(0.12, 0.35);
    blade.translate(0, 0.175, 0);
    const mat = new THREE.MeshLambertMaterial({
      color: 0x5a8a3a, side: THREE.DoubleSide, transparent: true, opacity: 0.92,
    });
    const mesh = new THREE.InstancedMesh(blade, mat, TUNING.grassCount);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    const dummy = new THREE.Object3D();
    let i = 0;
    while (i < TUNING.grassCount) {
      const a = Math.random() * Math.PI * 2;
      const r = 2.5 + Math.random() * (TUNING.arenaRadius - 3.2);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (Math.hypot(x, z) < 2.2) continue;
      dummy.position.set(x, 0, z);
      dummy.rotation.y = Math.random() * Math.PI;
      dummy.rotation.z = (Math.random() - 0.5) * 0.25;
      dummy.scale.setScalar(0.7 + Math.random() * 0.8);
      dummy.updateMatrix();
      mesh.setMatrixAt(i++, dummy.matrix);
    }
    mesh.count = i;
    mesh.instanceMatrix.needsUpdate = true;
    scene.add(mesh);

    /* Foliage bushes */
    const bushGeo = new THREE.SphereGeometry(0.45, 8, 6);
    const bushMat = new THREE.MeshStandardMaterial({ color: 0x3d7a38, roughness: 0.85 });
    const bushes = new THREE.InstancedMesh(bushGeo, bushMat, TUNING.foliageCount);
    bushes.castShadow = true;
    let j = 0;
    while (j < TUNING.foliageCount) {
      const a = Math.random() * Math.PI * 2;
      const r = 5 + Math.random() * (TUNING.arenaRadius - 5.5);
      dummy.position.set(Math.cos(a) * r, 0.25, Math.sin(a) * r);
      dummy.rotation.set(0, Math.random() * Math.PI, 0);
      dummy.scale.set(0.6 + Math.random(), 0.5 + Math.random() * 0.6, 0.6 + Math.random());
      dummy.updateMatrix();
      bushes.setMatrixAt(j++, dummy.matrix);
    }
    bushes.instanceMatrix.needsUpdate = true;
    scene.add(bushes);
  }

  function initTrail() {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(TUNING.trailLength * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.LineBasicMaterial({
      color: 0xd0e8ff, transparent: true, opacity: 0.65, depthWrite: false,
    });
    trailLine = new THREE.Line(geo, mat);
    trailLine.frustumCulled = false;
    trailLine.visible = false;
    scene.add(trailLine);
    trailPts = [];
  }

  function updateTrail(active) {
    if (!vel || !trailLine) return;
    const tip = new THREE.Vector3(0, -0.75, 0);
    const sword = vel.userData.parts && vel.userData.parts.sword;
    if (sword) sword.localToWorld(tip);
    else tip.copy(vel.position).add(new THREE.Vector3(0, 1.2, 0.5));
    if (active) {
      trailPts.push(tip.clone());
      if (trailPts.length > TUNING.trailLength) trailPts.shift();
      trailLine.visible = trailPts.length > 1;
    } else {
      trailPts.shift();
      if (trailPts.length < 2) trailLine.visible = false;
    }
    const arr = trailLine.geometry.attributes.position.array;
    for (let i = 0; i < TUNING.trailLength; i++) {
      const p = trailPts[i] || trailPts[trailPts.length - 1] || tip;
      arr[i * 3] = p.x; arr[i * 3 + 1] = p.y; arr[i * 3 + 2] = p.z;
    }
    trailLine.geometry.attributes.position.needsUpdate = true;
    trailLine.geometry.setDrawRange(0, Math.max(2, trailPts.length));
  }

  function spawnSparks(pos) {
    for (let i = 0; i < TUNING.sparkCount; i++) {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 6, 4),
        new THREE.MeshBasicMaterial({ color: 0xffe8a0 })
      );
      m.position.copy(pos);
      m.position.y += 0.8 + Math.random() * 0.4;
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        1.5 + Math.random() * 3,
        (Math.random() - 0.5) * 4
      );
      scene.add(m);
      sparks.push({ mesh: m, vel, life: 0.35 + Math.random() * 0.25 });
    }
  }

  function updateSparks(dt) {
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.life -= dt;
      s.vel.y -= 9 * dt;
      s.mesh.position.addScaledVector(s.vel, dt);
      s.mesh.material.opacity = Math.max(0, s.life * 3);
      s.mesh.material.transparent = true;
      if (s.life <= 0) {
        scene.remove(s.mesh);
        s.mesh.geometry.dispose();
        s.mesh.material.dispose();
        sparks.splice(i, 1);
      }
    }
  }

  function buildWorld() {
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(TUNING.fogColor, TUNING.fogNear, TUNING.fogFar);
    scene.background = new THREE.Color(TUNING.fogColor);
    scene.add(makeSky());

    const hemi = new THREE.HemisphereLight(TUNING.hemiSky, TUNING.hemiGround, TUNING.hemiIntensity);
    scene.add(hemi);

    sun = new THREE.DirectionalLight(TUNING.sunColor, TUNING.sunIntensity);
    sun.position.set(10, 16, 6);
    sun.castShadow = !useBlobShadows;
    sun.shadow.mapSize.set(TUNING.shadowMapSize, TUNING.shadowMapSize);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 45;
    sun.shadow.camera.left = -18;
    sun.shadow.camera.right = 18;
    sun.shadow.camera.top = 18;
    sun.shadow.camera.bottom = -18;
    sun.shadow.bias = -0.0008;
    sun.shadow.normalBias = 0.03;
    scene.add(sun);
    scene.add(sun.target);

    const fill = new THREE.DirectionalLight(0xa8c0e8, 0.28);
    fill.position.set(-6, 6, -8);
    scene.add(fill);

    scene.add(Models.makeGround());
    scene.add(Models.makeTreeBorder(20));
    addInstancedGrass();

    const tree = Models.makeShamiTree();
    scene.add(tree);

    const ruins = [
      [-6, -5, 0.4], [6, -4, -0.5], [-5, 6, 1.2], [7, 5, -0.2],
      [-8, 1, 0.8], [5, -8, 0.1], [2, 9, 0.3], [-9, -6, -0.4],
    ];
    ruins.forEach(([x, z, rot], i) => {
      const p = i % 2 === 0 ? Models.makeRuinPillar() : Models.makeRuinWall();
      p.position.set(x, 0, z);
      p.rotation.y = rot;
      scene.add(p);
    });
    const fallen = Models.makeRuinPillar();
    fallen.rotation.z = Math.PI / 2;
    fallen.position.set(3.5, 0.32, 7);
    scene.add(fallen);

    vel = Models.makeVel();
    vel.position.set(0, 0, 5);
    scene.add(vel);

    dog = Models.makeDog();
    dog.position.set(-1.5, 0, 6);
    scene.add(dog);

    enemies = [];
    const spots = [[-7, -3], [8, 2], [-3, -8]];
    for (let i = 0; i < TUNING.enemyCount; i++) {
      const e = Models.makeDemon(i % 3);
      e.position.set(spots[i][0], 0, spots[i][1]);
      e.userData.hp = TUNING.enemyHp;
      e.userData.atkCd = 1 + Math.random();
      e.userData.flash = 0;
      e.userData.kb = new THREE.Vector3();
      e.userData.alive = true;
      e.userData.attacking = false;
      scene.add(e);
      enemies.push(e);
    }

    if (useBlobShadows) {
      [vel, dog, ...enemies].forEach(obj => {
        const b = Models.makeBlobShadow();
        obj.add(b);
        blobShadows.push({ parent: obj, blob: b });
      });
    }

    camera = new THREE.PerspectiveCamera(TUNING.camFov, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, TUNING.camHeight, 5 + TUNING.camDistance);

    initTrail();

    const w = window.innerWidth, h = window.innerHeight;
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), TUNING.bloomStrength, TUNING.bloomRadius, TUNING.bloomThreshold);
    composer.addPass(bloomPass);
  }

  function startGame() {
    if (started && state !== 'over' && state !== 'win' && state !== 'title') return;
    AudioFX.resume();
    AudioFX.startMusic();
    velHp = TUNING.velMaxHp;
    invuln = 0; atkT = 0; atkCd = 0;
    vel.position.set(0, 0, 5);
    vel.rotation.y = 0;
    dog.position.set(-1.5, 0, 6);
    enemies.forEach((e, i) => {
      const spots = [[-7, -3], [8, 2], [-3, -8]];
      e.position.set(spots[i][0], 0, spots[i][1]);
      e.userData.hp = TUNING.enemyHp;
      e.userData.alive = true;
      e.userData.flash = 0;
      e.userData.kb.set(0, 0, 0);
      e.visible = true;
      e.traverse(c => {
        if (c.isMesh && c.material && c.material.color && c.userData.baseColor == null) {
          c.userData.baseColor = c.material.color.getHex();
        }
      });
    });
    {
      const back = new THREE.Vector3(Math.sin(vel.rotation.y), 0, Math.cos(vel.rotation.y));
      camera.position.copy(vel.position).addScaledVector(back, -TUNING.camDistance).add(new THREE.Vector3(0, TUNING.camHeight, 0));
      camera.lookAt(vel.position.clone().add(new THREE.Vector3(0, TUNING.camLookHeight, 0)));
    }
    state = 'play';
    titleEl().style.display = 'none';
    pauseEl().style.display = 'none';
    showMsg('Clear the Shami grove of rakshasas.', 3);
    updateHUD();
    started = true;
  }

  function togglePause() {
    if (state === 'play') {
      state = 'pause';
      pauseEl().style.display = 'flex';
    } else if (state === 'pause') {
      state = 'play';
      pauseEl().style.display = 'none';
      AudioFX.resume();
    }
  }

  function hurtVel(dmg, from) {
    if (invuln > 0 || state !== 'play') return;
    let d = dmg;
    if (blocking) {
      d = Math.max(0, dmg * (1 - TUNING.blockDamageReduce));
      AudioFX.block();
      if (d <= 0) return;
    }
    velHp -= d;
    invuln = TUNING.invulnTime;
    AudioFX.hurt();
    if (from) {
      const kb = vel.position.clone().sub(from).setY(0).normalize().multiplyScalar(TUNING.knockbackForce * 0.6);
      vel.position.add(kb);
    }
    updateHUD();
    if (velHp <= 0) {
      velHp = 0;
      state = 'over';
      showMsg('Vel falls. Press Z / tap ATTACK to rise again.', 99);
      AudioFX.stopMusic();
    }
  }

  function hitEnemy(e) {
    if (!e.userData.alive) return;
    e.userData.hp -= TUNING.attackDamage;
    e.userData.flash = 0.15;
    const kb = e.position.clone().sub(vel.position).setY(0).normalize().multiplyScalar(TUNING.knockbackForce);
    e.userData.kb.copy(kb);
    AudioFX.hit();
    spawnSparks(e.position);
    if (e.userData.hp <= 0) {
      e.userData.alive = false;
      e.visible = false;
      const left = enemies.filter(x => x.userData.alive).length;
      if (left === 0) {
        state = 'win';
        showMsg('The grove is quiet. The Shami tree stands.', 99);
        AudioFX.win();
        AudioFX.stopMusic();
      } else showMsg(left + ' rakshasa remain.', 1.5);
    }
  }

  function updatePlay(dt) {
    animT += dt;
    if (invuln > 0) invuln -= dt;
    if (atkCd > 0) atkCd -= dt;
    if (atkT > 0) atkT -= dt;
    if (msgT > 0) { msgT -= dt; if (msgT <= 0) msgEl().style.opacity = '0'; }

    const axis = Input.moveAxis();
    blocking = Input.blockHeld() && atkT <= 0;
    const moving = Math.hypot(axis.x, axis.y) > 0.15;

    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0; forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    if (moving && atkT <= 0 && !blocking) {
      const wish = new THREE.Vector3();
      wish.addScaledVector(right, axis.x);
      wish.addScaledVector(forward, -axis.y);
      if (wish.lengthSq() > 0.001) {
        wish.normalize();
        vel.position.addScaledVector(wish, TUNING.velSpeed * dt);
        const targetYaw = Math.atan2(wish.x, wish.z);
        let dy = targetYaw - vel.rotation.y;
        while (dy > Math.PI) dy -= Math.PI * 2;
        while (dy < -Math.PI) dy += Math.PI * 2;
        vel.rotation.y += dy * Math.min(1, TUNING.velTurnSpeed * dt);
      }
    }

    const R = TUNING.arenaRadius - 0.8;
    const dist = Math.hypot(vel.position.x, vel.position.z);
    if (dist > R) { vel.position.x *= R / dist; vel.position.z *= R / dist; }
    vel.position.y = 0;

    if (Input.attackPressed() && atkCd <= 0 && !blocking) {
      atkT = TUNING.attackDuration;
      atkCd = TUNING.attackCooldown;
      AudioFX.sword();
    }
    if (atkT > 0 && atkT < TUNING.attackDuration * 0.55 && atkT > TUNING.attackDuration * 0.15) {
      enemies.forEach(e => {
        if (!e.userData.alive) return;
        const d = vel.position.distanceTo(e.position);
        if (d < TUNING.attackRange) {
          const toE = e.position.clone().sub(vel.position);
          const facing = new THREE.Vector3(Math.sin(vel.rotation.y), 0, Math.cos(vel.rotation.y));
          if (toE.normalize().dot(facing) > 0.15 || d < 1.0) {
            if (!e.userData._hitThisSwing) {
              e.userData._hitThisSwing = true;
              hitEnemy(e);
            }
          }
        }
      });
    } else if (atkT <= 0) {
      enemies.forEach(e => { e.userData._hitThisSwing = false; });
    }

    let pose = 'idle';
    if (atkT > 0) pose = 'attack';
    else if (blocking) pose = 'block';
    else if (moving) pose = 'walk';
    Models.poseVel(vel, pose, pose === 'attack' ? (1 - atkT / TUNING.attackDuration) : animT, dt);
    vel.visible = invuln <= 0 || Math.floor(invuln * 12) % 2 === 0;
    updateTrail(atkT > 0);

    dogBiteCd -= dt;
    dogBarkT -= dt;
    const dogTarget = vel.position.clone().add(new THREE.Vector3(-1.2, 0, 0.8).applyAxisAngle(new THREE.Vector3(0, 1, 0), vel.rotation.y));
    const dogTo = dogTarget.clone().sub(dog.position);
    dogTo.y = 0;
    if (dogTo.length() > TUNING.dogFollowDist) {
      dogTo.normalize();
      dog.position.addScaledVector(dogTo, TUNING.dogSpeed * dt);
      dog.rotation.y = Math.atan2(dogTo.x, dogTo.z);
    }
    dog.position.y = 0;

    let nearest = null, nearestD = 99;
    enemies.forEach(e => {
      if (!e.userData.alive) return;
      const d = dog.position.distanceTo(e.position);
      if (d < nearestD) { nearestD = d; nearest = e; }
    });
    dogBiting = false;
    if (nearest && nearestD < 2.2 && dogBiteCd <= 0) {
      dogBiteCd = TUNING.dogBiteCooldown;
      dogBiting = true;
      nearest.userData.hp -= TUNING.dogBiteDamage;
      nearest.userData.flash = 0.12;
      nearest.userData.kb.copy(nearest.position.clone().sub(dog.position).setY(0).normalize().multiplyScalar(2));
      AudioFX.bark();
      spawnSparks(nearest.position);
      if (nearest.userData.hp <= 0) {
        nearest.userData.alive = false;
        nearest.visible = false;
        const left = enemies.filter(x => x.userData.alive).length;
        if (left === 0) {
          state = 'win';
          showMsg('The grove is quiet. The Shami tree stands.', 99);
          AudioFX.win();
          AudioFX.stopMusic();
        }
      }
    } else if (dogBarkT <= 0 && nearest && nearestD < 8) {
      dogBarkT = TUNING.dogBarkInterval + Math.random() * 2;
      AudioFX.bark();
    }
    Models.poseDog(dog, animT, dogBiting);

    enemies.forEach(e => {
      if (!e.userData.alive) return;
      e.userData.atkCd -= dt;
      if (e.userData.flash > 0) {
        e.userData.flash -= dt;
        e.traverse(c => {
          if (c.isMesh && c.material && c.material.color) {
            if (c.userData.baseColor == null) c.userData.baseColor = c.material.color.getHex();
            c.material.color.setHex(e.userData.flash > 0 ? 0xffffff : c.userData.baseColor);
          }
        });
      }
      if (e.userData.kb.lengthSq() > 0.01) {
        e.position.addScaledVector(e.userData.kb, dt);
        e.userData.kb.multiplyScalar(Math.max(0, 1 - 6 * dt));
      }
      const toVel = vel.position.clone().sub(e.position);
      toVel.y = 0;
      const distV = toVel.length();
      e.userData.attacking = false;
      if (distV < TUNING.enemyAggroRange && distV > 0.01) {
        toVel.normalize();
        if (distV > TUNING.enemyAttackRange * 0.85) e.position.addScaledVector(toVel, TUNING.enemySpeed * dt);
        e.rotation.y = Math.atan2(toVel.x, toVel.z);
        if (distV < TUNING.enemyAttackRange && e.userData.atkCd <= 0) {
          e.userData.atkCd = TUNING.enemyAttackCooldown;
          e.userData.attacking = true;
          hurtVel(TUNING.enemyDamage, e.position);
        }
      }
      const ed = Math.hypot(e.position.x, e.position.z);
      if (ed > R) { e.position.x *= R / ed; e.position.z *= R / ed; }
      e.position.y = 0;
      Models.poseDemon(e, animT + e.id, e.userData.attacking || e.userData.atkCd > TUNING.enemyAttackCooldown - 0.3);
    });

    const back = new THREE.Vector3(Math.sin(vel.rotation.y), 0, Math.cos(vel.rotation.y));
    const desired = vel.position.clone()
      .addScaledVector(back, -TUNING.camDistance)
      .add(new THREE.Vector3(0, TUNING.camHeight, 0));
    camera.position.lerp(desired, TUNING.camLerp);
    camera.lookAt(vel.position.clone().add(new THREE.Vector3(0, TUNING.camLookHeight, 0)));
    if (sun) sun.target.position.copy(vel.position);

    updateSparks(dt);
  }

  function frame() {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, clock.getDelta());
    if (Input.pausePressed()) togglePause();

    if (state === 'title') {
      const t = clock.elapsedTime;
      camera.position.set(Math.sin(t * 0.25) * 11, 5.5, Math.cos(t * 0.25) * 11);
      camera.lookAt(0, 1.8, 0);
      if (vel) Models.poseVel(vel, 'idle', t, dt);
      if (dog) Models.poseDog(dog, t, false);
    } else if (state === 'play') {
      updatePlay(dt);
    } else if (state === 'over' || state === 'win') {
      if (Input.attackPressed()) startGame();
      updateSparks(dt);
    }

    if (composer) composer.render();
    else renderer.render(scene, camera);
    Input.endFrame();
  }

  function detectSlowShadows() {
    /* Coarse mobile / software-GL heuristic → prefer blob shadows. */
    const ua = navigator.userAgent || '';
    const mobile = /Android|iPhone|iPad|Mobile/i.test(ua);
    if (mobile || TUNING.preferBlobShadows) {
      useBlobShadows = true;
      if (renderer) {
        renderer.shadowMap.enabled = false;
      }
    }
  }

  function boot() {
    detectSlowShadows();
    makeRenderer();
    clock = new THREE.Clock();
    buildWorld();
    Input.bindTouch(document.getElementById('touch'));
    updateHUD();
    window.addEventListener('resize', resize);
    resize();

    const startHandler = (e) => {
      if (state !== 'title') return;
      e && e.preventDefault && e.preventDefault();
      Input.tryFullscreenLandscape();
      startGame();
    };
    titleEl().addEventListener('click', startHandler);
    titleEl().addEventListener('touchend', startHandler, { passive: false });
    window.addEventListener('keydown', e => {
      if (state === 'title' && (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyZ' || e.code === 'KeyJ')) startHandler(e);
      if (e.code === 'KeyM') { muted = !muted; AudioFX.setMute(muted); }
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && state === 'play') togglePause();
    });
    requestAnimationFrame(frame);
  }

  boot();
})();
