// Notebook: sepia ink on parchment, services as small machines (wheels, cams, levers),
// cross-hatched shading and margin annotations in a quick hand.
(function () {
  var K = window.KIT, INK = '#4a3420', RED = '#8a2f1d';
  function wheel(g, r, teeth, c) {
    var d = '';
    for (var i = 0; i < teeth * 2; i++) {
      var a = (i / (teeth * 2)) * Math.PI * 2, rr = i % 2 ? r : r + 7;
      d += (i ? 'L' : 'M') + (Math.cos(a) * rr).toFixed(1) + ' ' + (Math.sin(a) * rr).toFixed(1);
    }
    K.svg('path', { d: d + 'Z', fill: 'none', stroke: c, 'stroke-width': 2.2 }, g);
    K.svg('circle', { r: r * .35, fill: 'none', stroke: c, 'stroke-width': 2 }, g);
    [0, 1, 2, 3].forEach(function (k) { var a = k * Math.PI / 2; K.svg('line', { x1: Math.cos(a) * r * .35, y1: Math.sin(a) * r * .35, x2: Math.cos(a) * r * .85, y2: Math.sin(a) * r * .85, stroke: c, 'stroke-width': 1.6 }, g); });
  }
  function machine(n, g) {
    var c = n.role === 'added' ? RED : INK, op = n.role === 'removed' ? .45 : 1, h = K.svg('g', { opacity: op }, g);
    // Cross-hatching under every machine gives it weight on the page.
    for (var i = -40; i <= 40; i += 7) K.svg('line', { x1: i - 10, y1: 44, x2: i + 10, y2: 30, stroke: c, 'stroke-width': .8, opacity: .55 }, h);
    if (n.kind === 'switch') {
      K.svg('circle', { r: 10, fill: 'none', stroke: c, 'stroke-width': 2 }, h);
      K.svg('path', { d: 'M-26 26 L0 0 L26 26', fill: 'none', stroke: c, 'stroke-width': 2 }, h);
      return { r: 30, lever: K.svg('line', { x1: 0, y1: 0, x2: 34, y2: 0, stroke: RED, 'stroke-width': 3.5, 'stroke-linecap': 'round' }, h) };
    }
    if (n.kind === 'store') {
      K.svg('ellipse', { cx: 0, cy: -20, rx: 34, ry: 10, fill: 'none', stroke: c, 'stroke-width': 2.2 }, h);
      K.svg('path', { d: 'M-34 -20 V22 A34 10 0 0 0 34 22 V-20', fill: 'none', stroke: c, 'stroke-width': 2.2 }, h);
      return { r: 40 };
    }
    wheel(h, 30, n.role === 'added' ? 12 : 9, c);
    if (n.role === 'changed') wheel(K.svg('g', { transform: 'translate(32 -24) scale(.5)' }, h), 30, 8, c);
    return { r: 40 };
  }
  window.LOOK = {
    name: 'notebook',
    role: { neutral: INK, changed: '#6b4c2a', added: RED, removed: '#9a8466', flag: RED },
    boardFilter: false, edgeWidth: 2.4,
    css: [
      ':root{--stage-bg:#d9c7a3;--frame-bg:#ead9b8;--frame-radius:6px;--frame-shadow:0 0 0 1px rgba(74,52,32,.25),0 24px 40px -24px rgba(60,30,0,.6);',
      '--ink:' + INK + ';--heading:' + INK + ';--chip-bg:rgba(74,52,32,.1);--chip-ink:' + INK + ';--tag-bg:transparent;--tag-ink:' + INK + ';',
      '--board-bg:#ead9b8;--board-border:1px solid rgba(74,52,32,.3);--board-ink:' + INK + ';--code-bg:#3a2816;--code-ink:#f1e3c4;',
      '--cap-bg:rgba(58,40,22,.92);--cap-ink:#f1e3c4;--cap-dim:rgba(241,227,196,.45);--display-weight:700;--display-stretch:85%;--token-ink:#f1e3c4}',
      '.ground{background:radial-gradient(500px 300px at 20% 30%,rgba(120,80,30,.18),transparent 70%),radial-gradient(400px 260px at 85% 75%,rgba(120,80,30,.14),transparent 70%),var(--stage-bg)}',
      '.frame{background-image:radial-gradient(360px 220px at 75% 25%,rgba(150,100,40,.12),transparent 70%)}',
      '.scene h2{font:600 54px/1 var(--hand)}',
      '.flabel{font:600 25px/1 var(--hand)}.elabel{font:600 22px/1 var(--hand);fill:' + RED + '}',
      '.fnote{font-size:30px;color:' + RED + '}.token rect{fill:' + RED + '}.morph{background:' + INK + '}'
    ].join(''),
    flowNode: machine
  };
})();
