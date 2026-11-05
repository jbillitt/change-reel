// window.THREE for registry blocks written against three r147. Bundled by build-reel.mjs into an IIFE.
// Puts back the r147 look on r187: no colour management, linear output unless the block asks for sRGB,
// legacy light units, and point/spot lights that default to decay 1.
import * as T from 'three';

T.ColorManagement.enabled = false;

// r162 removed the encoding API that r147 blocks still use: map it onto colour spaces.
const ENC = { 3000: T.LinearSRGBColorSpace, 3001: T.SRGBColorSpace };
const toEnc = (cs) => (cs === T.SRGBColorSpace ? 3001 : 3000);
Object.defineProperty(T.Texture.prototype, 'encoding', {
  get() { return toEnc(this.colorSpace); },
  set(v) { this.colorSpace = ENC[v] ?? T.NoColorSpace; },
  configurable: true,
});

class WebGLRenderer extends T.WebGLRenderer {
  constructor(p) {
    super(p);
    this.outputColorSpace = T.LinearSRGBColorSpace; // r152 made sRGB the default
  }
  get outputEncoding() { return toEnc(this.outputColorSpace); }
  set outputEncoding(v) { this.outputColorSpace = ENC[v] ?? T.LinearSRGBColorSpace; }
  // r155 dropped legacy light units: scale by pi for the draw only, so block code reads back its own values.
  render(scene, camera) {
    const lit = [];
    scene.traverseVisible((o) => { if (o.isLight) { lit.push(o); o.intensity *= Math.PI; } });
    try { super.render(scene, camera); } finally { for (const o of lit) o.intensity /= Math.PI; }
  }
}

// r155 changed the default decay from 1 to 2. The decay argument is index 3 for PointLight, 5 for SpotLight.
class PointLight extends T.PointLight {
  constructor(color, intensity, distance, decay = 1) { super(color, intensity, distance, decay); }
}
class SpotLight extends T.SpotLight {
  constructor(color, intensity, distance, angle, penumbra, decay = 1) { super(color, intensity, distance, angle, penumbra, decay); }
}

window.THREE = { ...T, WebGLRenderer, PointLight, SpotLight, LinearEncoding: 3000, sRGBEncoding: 3001 };
