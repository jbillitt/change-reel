// Paper: layered cut-paper puppets with real silhouettes, one character type per role.
(function () {
  var K = window.KIT, INK = '#141833', SKIN = ['#f3c7a6', '#e8b892', '#f0c3a1', '#d9a07c', '#f3c7a6'];

  function face(g, cx, cy, i, o) {
    var eyes = K.svg('g', {}, g), pupils = [];
    [-15, 15].forEach(function (dx) { pupils.push(K.svg('circle', { cx: cx + dx, cy: cy - 2, r: 5, fill: INK }, eyes)); });
    if (o && o.tired) K.svg('path', { d: 'M' + (cx - 24) + ' ' + (cy - 9) + ' h16 M' + (cx + 8) + ' ' + (cy - 9) + ' h16', stroke: INK, 'stroke-width': 4, 'stroke-linecap': 'round' }, g);
    var mouth = K.svg('ellipse', { cx: cx, cy: cy + 22, rx: 9, ry: 2.5, fill: INK }, g);
    return { eyes: eyes, pupils: pupils, mouth: mouth };
  }

  function puppet(role, i) {
    var s = K.svg('svg', { width: 240, height: 290, viewBox: '-120 -110 240 290' });
    var g = K.svg('g', { filter: 'url(#paper)' }, s), skin = SKIN[i % SKIN.length], f;
    if (role === 'changed') { // a tired postal clerk with a satchel
      K.svg('path', { d: 'M-66 180 C-74 80 -52 34 0 34 C52 34 74 80 66 180 Z', fill: '#b7791f' }, g);
      K.svg('circle', { cx: 0, cy: -4, r: 44, fill: skin }, g);
      K.svg('path', { d: 'M-50 -24 Q0 -58 50 -24 L58 -18 L-58 -18 Z', fill: '#5b3d12' }, g);
      K.svg('rect', { x: -30, y: -44, width: 60, height: 16, rx: 5, fill: '#5b3d12' }, g);
      f = face(g, 0, -2, i, { tired: true });
      K.svg('path', { d: 'M-60 60 L50 140', stroke: '#5b3d12', 'stroke-width': 10 }, g);
      K.svg('rect', { x: 22, y: 118, width: 74, height: 54, rx: 10, fill: '#7a5216' }, g);
    } else if (role === 'added') { // a courier mid-stride, visor down
      K.svg('path', { d: 'M-120 60 h60 M-140 90 h70 M-115 120 h50', stroke: '#1a7f37', 'stroke-width': 8, 'stroke-linecap': 'round', opacity: .55 }, g);
      K.svg('path', { d: 'M-52 180 C-60 82 -42 34 4 34 C50 34 66 82 58 180 Z', fill: '#1a7f37' }, g);
      K.svg('circle', { cx: 4, cy: -6, r: 44, fill: skin }, g);
      K.svg('path', { d: 'M-42 -12 C-42 -66 50 -66 50 -12 Z', fill: '#0f5a26' }, g);
      K.svg('path', { d: 'M-36 -14 H52 Q48 4 8 4 Q-32 4 -36 -14 Z', fill: '#9ff0bf', opacity: .9 }, g);
      f = face(g, 4, 6, i); f.pupils.forEach(function (p) { p.setAttribute('opacity', 0); });
      K.svg('path', { d: 'M44 80 L92 56', stroke: '#1a7f37', 'stroke-width': 16, 'stroke-linecap': 'round' }, g);
    } else if (role === 'flag') { // a crossing guard, flag raised
      K.svg('path', { d: 'M-56 180 C-62 84 -44 40 0 40 C44 40 62 84 56 180 Z', fill: '#d6336c' }, g);
      K.svg('path', { d: 'M-56 116 h112', stroke: '#ffe066', 'stroke-width': 12 }, g);
      K.svg('circle', { cx: 0, cy: -2, r: 44, fill: skin }, g);
      K.svg('path', { d: 'M-46 -16 Q0 -66 46 -16 Z', fill: INK }, g);
      f = face(g, 0, 0, i);
      K.svg('path', { d: 'M-50 66 L-92 -54', stroke: INK, 'stroke-width': 7, 'stroke-linecap': 'round' }, g);
      K.svg('path', { d: 'M-92 -54 L-28 -80 L-92 -104 Z', fill: '#ff7aa8' }, g);
    } else if (role === 'removed') { // a retiree with a suitcase, already half out of shot
      K.svg('path', { d: 'M-56 180 C-62 86 -44 42 0 42 C44 42 62 86 56 180 Z', fill: '#9aa3b5' }, g);
      K.svg('circle', { cx: 0, cy: 0, r: 42, fill: skin }, g);
      K.svg('path', { d: 'M-44 -10 Q0 -58 44 -10 Q30 -26 0 -26 Q-30 -26 -44 -10 Z', fill: '#e6e8ee' }, g);
      f = face(g, 0, 2, i, { tired: true });
      K.svg('rect', { x: 40, y: 120, width: 70, height: 52, rx: 8, fill: '#6b5844' }, g);
      K.svg('path', { d: 'M62 120 v-10 h26 v10', stroke: '#6b5844', 'stroke-width': 6, fill: 'none' }, g);
    } else { // neutral: a dispatcher with a headset and clipboard
      K.svg('path', { d: 'M-62 180 C-70 84 -50 36 0 36 C50 36 70 84 62 180 Z', fill: '#3b4bd8' }, g);
      K.svg('circle', { cx: 0, cy: -4, r: 46, fill: skin }, g);
      K.svg('path', { d: 'M-48 -10 C-48 -64 48 -64 48 -10', fill: 'none', stroke: INK, 'stroke-width': 7 }, g);
      K.svg('rect', { x: -56, y: -18, width: 14, height: 26, rx: 6, fill: INK }, g);
      f = face(g, 0, -4, i);
      K.svg('rect', { x: 22, y: 76, width: 60, height: 78, rx: 6, fill: '#fff', transform: 'rotate(10 52 115)' }, g);
    }
    return { svg: s, body: g, eyes: f.eyes, pupils: f.pupils, mouth: f.mouth, mouthRy: [2.5, 7] };
  }

  window.LOOK = {
    name: 'paper',
    boardFilter: false,
    css: [
      ':root{--stage-bg:#dfe6f1;--frame-bg:#eef2f8;--frame-shadow:0 8px 0 rgba(20,24,51,.12),0 24px 40px -20px rgba(20,24,51,.35);',
      '--heading:#141833;--chip-bg:#141833;--chip-ink:#fff;--tag-bg:#fff;--tag-ink:#141833;',
      '--board-bg:#fffdf8;--board-border:0 solid transparent;--board-ink:#1f3cff;--code-bg:#141833;--cap-bg:#141833}',
      '.scene h2{font-stretch:80%}',
      '.card .sub{color:#3a3f5c}',
      '.board{box-shadow:0 6px 0 rgba(20,24,51,.12)}',
      '.chalkline{font-size:58px}',
      '.stick{background:#1f3cff;height:12px;border-radius:6px}',
      '.tag{box-shadow:0 3px 0 rgba(20,24,51,.15)}',
      '.spot{background:radial-gradient(circle at 50% 55%,#fff6d8 0,#fff6d8 34%,transparent 35%)}'
    ].join(''),
    ground: function (g) {
      var s = K.svg('svg', { viewBox: '0 0 1280 720', width: 1280, height: 720, style: 'position:absolute;inset:0' }, g);
      K.svg('path', { filter: 'url(#paper)', fill: '#cfd8e8', d: 'M0 470 C140 420 260 460 380 435 S640 390 780 425 S1060 460 1280 410 V720 H0 Z' }, s);
      K.svg('path', { filter: 'url(#paper)', fill: '#bcc8de', d: 'M0 560 C180 520 330 545 520 528 S860 510 1010 538 S1180 560 1280 540 V720 H0 Z' }, s);
    },
    actor: function (role, c, i) { return puppet(role, i); },
    castSet: function (world) {
      var s = K.svg('svg', { viewBox: '0 0 1136 506', width: 1136, height: 506, style: 'position:absolute;inset:0' }, world);
      K.svg('path', { filter: 'url(#paper)', fill: '#dde4ef', d: 'M0 330 C200 300 420 330 600 310 S940 290 1136 315 V506 H0 Z' }, s);
    }
  };
})();
