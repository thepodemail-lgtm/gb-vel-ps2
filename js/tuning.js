'use strict';
/* All tweakables in plain English. Change these, refresh the page. */
export const TUNING = {
  /* Native resolution: renderer follows the window (no 320x240 buffer). */
  useNativeResolution: true,
  maxPixelRatio: 1.5,

  /* Fog: lighter than PS1 so the clearing stays readable. */
  fogColor: 0xc8d4b8,
  fogNear: 18,
  fogFar: 55,
  skyTop: 0x87b8e0,
  skyBottom: 0xd8e8c8,

  /* Camera chase. */
  camDistance: 7.2,
  camHeight: 3.6,
  camLerp: 0.1,
  camLookHeight: 1.2,
  camFov: 48,

  /* Vel movement and combat (same feel as PS1 demo). */
  velSpeed: 4.2,
  velTurnSpeed: 10,
  velMaxHp: 5,
  attackCooldown: 0.45,
  attackDuration: 0.32,
  attackRange: 1.6,
  attackDamage: 1,
  blockDamageReduce: 0.75,
  invulnTime: 0.9,
  knockbackForce: 3.5,

  /* Animation blend speeds (higher = snappier). */
  animBlendWalk: 8,
  animBlendAttack: 14,
  animBlendBlock: 10,
  animBlendIdle: 5,

  /* Dog companion. */
  dogFollowDist: 1.8,
  dogSpeed: 5.5,
  dogBiteCooldown: 2.8,
  dogBiteDamage: 1,
  dogBarkInterval: 4.5,

  /* Enemies. */
  enemySpeed: 1.6,
  enemyAttackRange: 1.4,
  enemyAttackCooldown: 1.4,
  enemyDamage: 1,
  enemyHp: 3,
  enemyAggroRange: 14,
  enemyCount: 3,

  /* Arena. */
  arenaRadius: 14,
  grassCount: 280,
  foliageCount: 40,

  /* Lighting / shadows. Soft maps; fall back to blob shadows if costly. */
  sunColor: 0xfff2d8,
  sunIntensity: 1.15,
  hemiSky: 0xb8d0f0,
  hemiGround: 0x6a8048,
  hemiIntensity: 0.55,
  shadowMapSize: 1024,
  preferBlobShadows: false,

  /* Bloom (UnrealBloomPass). Keep mild for a readable PS2 look. */
  bloomStrength: 0.45,
  bloomRadius: 0.35,
  bloomThreshold: 0.82,

  /* FX. */
  sparkCount: 14,
  trailLength: 8,

  /* Audio. */
  sfxVolume: 0.35,
  musicVolume: 0.08,
  musicEnabled: true,
};
