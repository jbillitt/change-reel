// Whiteboard: black marker on white,
// a slightly wobbly hand-drawn line, and colour only for the thing that changed.
(function () {
  var K = window.KIT, INK = '#151515', BLUE = '#1f5fbf', RED = '#d1352b', GREEN = '#1e8a3c';
  function blob(n, g) {
    var c = { added: GREEN, removed: '#9a9a9a', changed: BLUE, flag: RED }[n.role] || INK, r = n.kind === 'switch' ? 22 : 38;
    var w = K.svg('g', { filter: 'url(#wobble)' }, g);
    K.svg('circle', { r: r, fill: 'none', stroke: c, 'stroke-width': 5 }, w);
    K.svg('circle', { r: r + 3, fill: 'none', stroke: c, 'stroke-width': 1.5, opacity: .5, transform: 'translate(2 -1)' }, w);
    if (n.kind === 'store') K.svg('path', { d: 'M-18 -8 a18 6 0 0 0 36 0 a18 6 0 0 0 -36 0 v18 a18 6 0 0 0 36 0 v-18', fill: 'none', stroke: c, 'stroke-width': 3 }, w);
    var out = { r: r };
    if (n.kind === 'switch') out.lever = K.svg('line', { x1: 0, y1: 0, x2: 28, y2: 0, stroke: RED, 'stroke-width': 5, 'stroke-linecap': 'round' }, g);
    return out;
  }
  window.LOOK = {
    name: 'whiteboard',
    role: { neutral: INK, changed: BLUE, added: GREEN, removed: '#9a9a9a', flag: RED },
    boardFilter: false, edgeWidth: 4.5,
    css: [
      ':root{--stage-bg:#f4f4f2;--frame-bg:#ffffff;--frame-radius:10px;--frame-shadow:0 1px 2px rgba(0,0,0,.12),0 20px 40px -24px rgba(0,0,0,.35);',
      '--ink:' + INK + ';--heading:' + INK + ';--chip-bg:#151515;--chip-ink:#fff;--tag-bg:transparent;--tag-ink:' + INK + ';',
      '--board-bg:#ffffff;--board-border:0 solid transparent;--board-ink:' + INK + ';--code-bg:#151515;--cap-bg:#151515;--display-weight:800;--token-ink:#fff}',
      '.ground{background:var(--stage-bg)}',
      '.scene h2{font:600 54px/1 var(--hand)}',
      '.flabel{font:600 26px/1 var(--hand)}.elabel{font:600 22px/1 var(--hand);fill:' + RED + '}',
      '.fnote{font-size:32px;color:' + BLUE + '}',
      '.token rect{fill:' + RED + '}.morph{background:' + INK + '}',
      '.chalkline{font-size:58px}.stick{background:' + INK + ';height:12px;border-radius:6px}'
    ].join(''),
    ground: function () {
      var s = K.svg('svg', { width: 0, height: 0, style: 'position:absolute' }, document.body);
      var f = K.svg('filter', { id: 'wobble' }, s);
      K.svg('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.03', numOctaves: 2, seed: 3, result: 'n' }, f);
      K.svg('feDisplacementMap', { in: 'SourceGraphic', in2: 'n', scale: 4 }, f);
    },
    flowNode: blob
  };
})();
