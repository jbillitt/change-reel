// Lit 3D kit for world frames: window.LIT, on top of window.THREE_MODERN. The build loads it into any reel with a
// frame that names THREE_MODERN. A frame's whole 3D state is a pure function of time, draw(t); LIT.drive calls it.
(function () {
  var T = window.THREE_MODERN;

  // Renderer, scene, camera and image-based light. opts: fog [colour, near, far], background, exposure, env,
  // camera { fov, pos, look, ortho }.
  function stage(root, opts) {
    opts = opts || {};
    var renderer = new T.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1);
    renderer.setSize(1920, 1080, false);
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = opts.exposure == null ? 1 : opts.exposure;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFShadowMap; // r180+ removed PCFSoftShadowMap; shadow.radius softens instead
    var c = renderer.domElement;
    c.style.cssText = 'position:absolute;left:0;top:0;width:1920px;height:1080px';
    root.insertBefore(c, root.firstChild);
    var scene = new T.Scene();
    var pmrem = new T.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new T.RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = opts.env == null ? 0.4 : opts.env;
    if (opts.background) scene.background = new T.Color(opts.background);
    if (opts.fog) scene.fog = new T.Fog(opts.fog[0], opts.fog[1], opts.fog[2]);
    // camera.ortho (half the view height in world units) gives the iso look its parallel projection.
    var cam = opts.camera || {}, o = cam.ortho, camera = o ? new T.OrthographicCamera(-o * 16 / 9, o * 16 / 9, o, -o, 0.1, 200)
      : new T.PerspectiveCamera(cam.fov || 35, 1920 / 1080, 0.1, 200);
    camera.position.fromArray(cam.pos || [0, 4, 12]);
    camera.lookAt(new T.Vector3().fromArray(cam.look || [0, 0, 0]));
    var anchors = [];
    var st = {
      T: T, renderer: renderer, scene: scene, camera: camera, canvas: c, anchors: anchors,
      render: function () {
        renderer.render(scene, camera);
        anchors.forEach(place);
      },
    };
    function place(a) {
      var v = a.at.clone().project(camera);
      a.el.style.transform = 'translate(' + ((v.x + 1) * 960).toFixed(1) + 'px,' + ((1 - v.y) * 540).toFixed(1) + 'px) translate(' + a.dx + ',' + a.dy + ')';
    }
    return st;
  }

  // Warm shadow-casting key, cool rim, low hemisphere fill. Override any part: rig(st, { key: { pos: [...] } }).
  function rig(st, o) {
    o = o || {};
    var k = Object.assign({ color: 0xffd6a8, intensity: 260, pos: [5, 9, 6], target: [0, 0, 0], angle: 0.55, penumbra: 0.7 }, o.key);
    var key = new T.SpotLight(k.color, k.intensity, 0, k.angle, k.penumbra, 2);
    key.position.fromArray(k.pos);
    key.target.position.fromArray(k.target);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.radius = 6;
    key.shadow.bias = -0.0004;
    var r = Object.assign({ color: 0xa8c4ff, intensity: 1.2, pos: [-6, 5, -6] }, o.rim);
    var rim = new T.DirectionalLight(r.color, r.intensity);
    rim.position.fromArray(r.pos);
    var f = Object.assign({ sky: 0xfff1e0, ground: 0x2a1e16, intensity: 0.35 }, o.fill);
    var fill = new T.HemisphereLight(f.sky, f.ground, f.intensity);
    st.scene.add(key, key.target, rim, fill);
    return { key: key, rim: rim, fill: fill };
  }

  // The material palette. Colours come from the look; these set how a surface takes light.
  var mat = {
    metal: function (color, o) { return new T.MeshPhysicalMaterial(Object.assign({ color: color, metalness: 1, roughness: 0.25, clearcoat: 0.3, clearcoatRoughness: 0.2 }, o)); },
    lacquer: function (color, o) { return new T.MeshPhysicalMaterial(Object.assign({ color: color, metalness: 0, roughness: 0.45, clearcoat: 0.7, clearcoatRoughness: 0.15 }, o)); },
    matte: function (color, o) { return new T.MeshStandardMaterial(Object.assign({ color: color, roughness: 0.85, metalness: 0 }, o)); },
    // Transmission hazes whatever sits behind it (a dial face): use a faint clearcoat sheet instead.
    glass: function (o) { return new T.MeshPhysicalMaterial(Object.assign({ color: 0xffffff, metalness: 0, roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.1, depthWrite: false }, o)); },
  };

  // A seeded random stream: the same seed draws the same grain on every render.
  function rng(seed) {
    var s = typeof seed === 'number' ? seed >>> 0 : String(seed).split('').reduce(function (h, ch) { return Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0; }, 2166136261);
    return function () { s = (s + 0x6d2b79f5) >>> 0; var t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  // A canvas texture drawn by paint(ctx, rnd, w, h). It paints again once the page fonts load, so labels never
  // keep a fallback face; pass st so the frame repaints too.
  function texture(paint, w, h, o, st) {
    o = o || {};
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var tex = new T.CanvasTexture(c);
    tex.colorSpace = T.SRGBColorSpace;
    tex.anisotropy = 8;
    if (o.repeat) { tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.repeat.set(o.repeat[0], o.repeat[1]); }
    var draw = function () { var ctx = c.getContext('2d'); ctx.clearRect(0, 0, w, h); paint(ctx, rng(o.seed == null ? 1 : o.seed), w, h); tex.needsUpdate = true; };
    draw();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { draw(); if (st) st.render(); });
    return tex;
  }

  // Pin an HTML annotation to a 3D point. dx/dy offset the element from the point (CSS lengths, such as '-50%').
  function anchor(st, el, at, dx, dy) {
    el.style.position = 'absolute'; el.style.left = '0'; el.style.top = '0';
    st.anchors.push({ el: el, at: new T.Vector3().fromArray(at), dx: dx || '-50%', dy: dy || '-100%' });
  }

  // eased progress of t through [a, b], 0 before and 1 after.
  var eases = {};
  function span(t, a, b, ease) {
    var p = Math.min(1, Math.max(0, (t - a) / (b - a)));
    ease = ease || 'power3.out';
    return (eases[ease] = eases[ease] || gsap.parseEase(ease))(p);
  }

  // One driver tween from 0 to duration. Its property setter runs draw(t) and paints, so every seek (which fires
  // no onUpdate) lands the exact frame, whatever order GSAP updates other tweens in.
  function drive(tl, st, draw, duration) {
    var t0 = NaN, p = {};
    Object.defineProperty(p, 't', {
      get: function () { return t0; },
      set: function (v) { if (v === t0) return; t0 = v; draw(v); st.render(); },
    });
    p.t = 0;
    tl.fromTo(p, { t: 0 }, { t: duration, duration: duration, ease: 'none' }, 0);
  }

  window.LIT = { stage: stage, rig: rig, mat: mat, rng: rng, texture: texture, anchor: anchor, span: span, drive: drive };
})();
