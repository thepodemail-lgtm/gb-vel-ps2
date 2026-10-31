'use strict';
import * as THREE from 'three';

/* Procedural canvas textures — original, not from any game. */
function canvas(size, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  draw(ctx, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

function noise(ctx, size, alpha, scale) {
  const img = ctx.createImageData(size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const n = (Math.sin(x * scale) * Math.cos(y * scale * 1.3) + 1) * 0.5;
      const r = (Math.random() * 0.35 + n * 0.65) * 255;
      d[i] = d[i + 1] = d[i + 2] = r;
      d[i + 3] = alpha;
    }
  }
  ctx.putImageData(img, 0, 0);
}

export function makeGrassTex() {
  return canvas(128, (ctx, s) => {
    ctx.fillStyle = '#6a8a48';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 900; i++) {
      const x = Math.random() * s, y = Math.random() * s;
      ctx.fillStyle = Math.random() > 0.5 ? '#7a9a52' : '#5a7a3a';
      ctx.fillRect(x, y, 1 + Math.random() * 2, 2 + Math.random() * 4);
    }
    ctx.globalAlpha = 0.15;
    noise(ctx, s, 40, 0.4);
    ctx.globalAlpha = 1;
  });
}

export function makeDirtTex() {
  return canvas(128, (ctx, s) => {
    ctx.fillStyle = '#8a7048';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 600; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? '#9a8058' : '#7a6038';
      ctx.beginPath();
      ctx.arc(Math.random() * s, Math.random() * s, 1 + Math.random() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

export function makeStoneTex() {
  return canvas(128, (ctx, s) => {
    ctx.fillStyle = '#8a8678';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * s, y = Math.random() * s;
      const w = 10 + Math.random() * 30, h = 8 + Math.random() * 20;
      ctx.fillStyle = Math.random() > 0.5 ? '#9a9688' : '#7a7668';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = 'rgba(40,40,30,0.25)';
      ctx.strokeRect(x, y, w, h);
    }
    for (let i = 0; i < 80; i++) {
      ctx.fillStyle = 'rgba(100,120,70,0.35)';
      ctx.fillRect(Math.random() * s, Math.random() * s, 3 + Math.random() * 8, 2 + Math.random() * 5);
    }
  });
}

export function makeBarkTex() {
  return canvas(128, (ctx, s) => {
    ctx.fillStyle = '#5a3a22';
    ctx.fillRect(0, 0, s, s);
    for (let x = 0; x < s; x += 4) {
      ctx.strokeStyle = Math.random() > 0.5 ? '#6a4a2e' : '#4a2e18';
      ctx.lineWidth = 1 + Math.random() * 2;
      ctx.beginPath();
      ctx.moveTo(x + Math.random() * 2, 0);
      for (let y = 0; y < s; y += 8) ctx.lineTo(x + Math.sin(y * 0.1) * 2, y);
      ctx.stroke();
    }
  });
}

export function makeClothTex(hex) {
  const r = (hex >> 16) & 255, g = (hex >> 8) & 255, b = hex & 255;
  return canvas(64, (ctx, s) => {
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 2) {
      ctx.fillStyle = `rgba(255,255,255,${0.04 + (y % 4 === 0 ? 0.04 : 0)})`;
      ctx.fillRect(0, y, s, 1);
    }
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = `rgba(0,0,0,0.08)`;
      ctx.fillRect(Math.random() * s, Math.random() * s, 2, 2);
    }
  });
}

export function makeLeafTex() {
  return canvas(64, (ctx, s) => {
    ctx.fillStyle = '#3d7a38';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 120; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? '#4d8a48' : '#2d6a28';
      ctx.beginPath();
      ctx.ellipse(Math.random() * s, Math.random() * s, 2 + Math.random() * 4, 1 + Math.random() * 3, Math.random(), 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

export function makeSkyCubemap() {
  /* Gradient sky as a large dome texture (simple, readable). */
  return canvas(256, (ctx, s) => {
    const g = ctx.createLinearGradient(0, 0, 0, s);
    g.addColorStop(0, '#87b8e0');
    g.addColorStop(0.55, '#b8d0e8');
    g.addColorStop(1, '#d8e8c8');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    /* Soft sun disc */
    const sg = ctx.createRadialGradient(s * 0.7, s * 0.22, 2, s * 0.7, s * 0.22, 40);
    sg.addColorStop(0, 'rgba(255,250,220,0.9)');
    sg.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(0, 0, s, s);
  });
}
