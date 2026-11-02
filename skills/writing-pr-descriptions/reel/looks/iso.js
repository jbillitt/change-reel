// Isometric city: services are lit buildings on a dark grid; the speaker's windows light up as it talks.
(function () {
  var K = window.KIT, s = 22;
  var TOWER = {
    neutral: { top: '#9aa6ff', left: '#3b4bd8', right: '#2f3db8', h: 3.2 },
    changed: { top: '#d8b06a', left: '#9b7a3c', right: '#7a5d2b', h: 4.2 },
    added: { top: '#a8f5c4', left: '#1f9d4f', right: '#167a3d', h: 5.2 },
    removed: { top: '#6b7486', left: '#4a5263', right: '#3c4352', h: 2.4 },
    flag: { top: '#ff9cc2', left: '#d6336c', right: '#b0265a', h: 1.2 }
  };
  function P(x, y, z) { return [120 + (x - y) * s * .866, 190 + (x + y) * s * .5 - z * s]; }
  function pts(a) { return a.map(function (p) { var q = P(p[0], p[1], p[2]); return q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join(' '); }
  function prism(g, x, y, w, d, z0, h, c) {
    var z1 = z0 + h;
    K.svg('polygon', { points: pts([[x, y + d, z0], [x + w, y + d, z0], [x + w, y + d, z1], [x, y + d, z1]]), fill: c.left }, g);
    K.svg('polygon', { points: pts([[x + w, y, z0], [x + w, y + d, z0], [x + w, y + d, z1], [x + w, y, z1]]), fill: c.right }, g);
    K.svg('polygon', { points: pts([[x, y, z1], [x + w, y, z1], [x + w, y + d, z1], [x, y + d, z1]]), fill: c.top }, g);
  }
  function building(role) {
    var c = TOWER[role] || TOWER.neutral, svg = K.svg('svg', { width: 240, height: 260, viewBox: '0 0 240 260' });
    var g = K.svg('g', {}, svg);
    K.svg('ellipse', { cx: 120, cy: 236, rx: 90, ry: 26, fill: role === 'added' ? 'rgba(74,222,128,.35)' : 'rgba(0,0,0,.35)', filter: 'url(#glow)' }, g);
    prism(g, -1.5, -1.5 + 3.4, 4.6, 4.6, 0, .4, { top: '#1a2366', left: '#111a4e', right: '#0d1440' });
    var ww = [];
    if (role === 'flag') {
      prism(g, .3, 3.9, .3, .3, .4, 3.6, { top: '#e7e9ff', left: '#c9cdf0', right: '#aeb3dc' });
      var tp = P(.45, 4.05, 4);
      K.svg('path', { d: 'M' + tp[0] + ' ' + tp[1] + ' l 54 20 l -54 20 z', fill: '#ff4f9a', filter: 'url(#glow)' }, g);
    } else {
      prism(g, -.5, 2.4, 2.6, 2.6, .4, c.h, c);
      // Window strips on the front faces; they light when the building speaks.
      for (var k = 0; k < Math.floor(c.h / .8); k++) {
        var z = .9 + k * .8, a = P(-.2, 5.0, z), b = P(1.8, 5.0, z);
        ww.push(K.svg('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: '#fff7cc', 'stroke-width': 4, 'stroke-dasharray': '6 7', opacity: .25 }, g));
      }
      if (role === 'added') prism(g, -.2, 2.7, 2, 2, .4 + c.h, .25, { top: '#eafff1', left: '#9ff0bf', right: '#86e0ab' });
    }
    return {
      svg: svg, body: g,
      speak: function (tl, start, len) {
        ww.forEach(function (w, i) {
          for (var t = start + i * .05; t < start + len - .1; t += .22) {
            tl.to(w, { opacity: 1, duration: .06 }, t).to(w, { opacity: .45, duration: .1 }, t + .1);
          }
          tl.to(w, { opacity: .25, duration: .3 }, start + len);
        });
      }
    };
  }

  window.LOOK = {
    name: 'iso',
    boardFilter: false,
    css: [
      ':root{--stage-bg:#00031f;--frame-bg:transparent;--frame-shadow:none;--frame-radius:18px;',
      '--tag-bg:rgba(8,12,48,.85);--tag-ink:#e9ebff;--token-ink:#00031f;--board-bg:rgba(12,21,80,.72);--board-border:1px solid rgba(160,175,255,.25);',
      '--board-ink:#dfe5ff;--code-bg:rgba(8,12,48,.92);--cap-bg:rgba(6,9,40,.85)}',
      '.ground{background:radial-gradient(900px 600px at 50% 40%,#0c1550,#00031f 70%)}',
      '.tag{border:1px solid rgba(255,255,255,.14)}',
      '.floor{display:none}',
      '.spot{background:radial-gradient(ellipse at 50% 85%,rgba(159,240,191,.22),transparent 60%)}',
      '.chalkline{font:500 36px/1 var(--mono)}',
      '.stick{height:34px;width:16px;border-radius:2px;background:#9ff0bf;box-shadow:0 0 12px #9ff0bf}',
      '[data-type=user] .frame{background:rgba(12,21,80,.6);box-shadow:0 0 0 1px rgba(160,175,255,.2)}',
      '.parcel{background:#eafff1;color:#0f5a26;box-shadow:0 0 22px rgba(126,226,160,.7)}'
    ].join(''),
    ground: function (g) {
      var s2 = K.svg('svg', { viewBox: '0 0 1280 720', width: 1280, height: 720, style: 'position:absolute;inset:0;opacity:.5' }, g);
      for (var i = -20; i <= 40; i++) {
        K.svg('line', { x1: 640 + i * 38 - 900, y1: -40 + 0, x2: 640 + i * 38 + 900, y2: 1000, stroke: 'rgba(120,140,255,.10)' }, s2);
        K.svg('line', { x1: 640 + i * 38 + 900, y1: -40, x2: 640 + i * 38 - 900, y2: 1000, stroke: 'rgba(120,140,255,.10)' }, s2);
      }
    },
    actor: function (role) { return building(role); },
    castSet: function (world, sc) {
      // A glowing route along the street ties the buildings together.
      var s2 = K.svg('svg', { viewBox: '0 0 1136 506', width: 1136, height: 506, style: 'position:absolute;inset:0' }, world);
      K.svg('path', { d: 'M90 440 L1046 440', stroke: '#4ade80', 'stroke-width': 6, 'stroke-linecap': 'round', opacity: .55, filter: 'url(#glow)' }, s2);
    }
  };
})();
