// Ink: precise pen work on warm paper. Nodes are carefully inked shapes with fine hatching, and every edge carries
// chevrons so the direction of flow is never in doubt.
(function () {
  var K = window.KIT, INK = '#1d1a16', RED = '#9b2a1c';
  function node(n, g) {
    var c = n.role === 'added' ? RED : INK, op = n.role === 'removed' ? .45 : 1, r = n.kind === 'switch' ? 22 : 36;
    var h = K.svg('g', { opacity: op }, g), clip = K.uid('ic');
    var cp = K.svg('clipPath', { id: clip }, h);
    if (n.kind === 'store') K.svg('rect', { x: -40, y: -30, width: 80, height: 60, rx: 6 }, cp); else K.svg('circle', { r: r }, cp);
    var hatch = K.svg('g', { 'clip-path': 'url(#' + clip + ')' }, h);
    for (var i = -60; i <= 60; i += 6) K.svg('line', { x1: i, y1: -50, x2: i + 40, y2: 50, stroke: c, 'stroke-width': .9, opacity: .45 }, hatch);
    if (n.kind === 'store') K.svg('rect', { x: -40, y: -30, width: 80, height: 60, rx: 6, fill: 'none', stroke: c, 'stroke-width': 2.4 }, h);
    else K.svg('circle', { r: r, fill: 'none', stroke: c, 'stroke-width': 2.4 }, h);
    var out = { r: n.kind === 'store' ? 42 : r };
    if (n.kind === 'switch') out.lever = K.svg('line', { x1: 0, y1: 0, x2: 30, y2: 0, stroke: RED, 'stroke-width': 4, 'stroke-linecap': 'round' }, g);
    return out;
  }
  window.LOOK = {
    name: 'ink',
    role: { neutral: INK, changed: '#5a4a32', added: RED, removed: '#8a8172', flag: RED },
    boardFilter: false, edgeWidth: 2.4, chevrons: true,
    css: [
      ':root{--stage-bg:#ece6d8;--frame-bg:#f6f1e6;--frame-radius:4px;--frame-shadow:0 1px 0 rgba(0,0,0,.08),0 18px 40px -24px rgba(60,40,10,.4);',
      '--ink:' + INK + ';--heading:' + INK + ';--chip-bg:rgba(29,26,22,.08);--chip-ink:' + INK + ';--tag-bg:transparent;--tag-ink:' + INK + ';',
      '--board-bg:#f6f1e6;--board-border:1px solid rgba(29,26,22,.25);--board-ink:' + INK + ';--code-bg:#1d1a16;--code-ink:#efe7d6;',
      '--cap-bg:rgba(29,26,22,.9);--cap-ink:#f6f1e6;--cap-dim:rgba(246,241,230,.45);--display-weight:700;--display-stretch:85%;--token-ink:#f6f1e6}',
      '.ground{background:var(--stage-bg)}',
      '.scene h2{font:600 52px/1 var(--hand)}',
      '.flabel{font:600 24px/1 var(--hand)}.elabel{font:600 21px/1 var(--hand);fill:' + RED + '}',
      '.fnote{font-size:30px;color:' + RED + '}.token rect{fill:' + RED + '}.morph{background:' + INK + '}'
    ].join(''),
    flowNode: node
  };
})();
