// Diorama: the scene as a small model on a tabletop, tilted towards the viewer. Nodes are painted blocks that cast
// shadows, edges are raised tracks, and the camera looks down on it like a museum display case.
(function () {
  var K = window.KIT;
  var PAINT = { neutral: ['#7d8cff', '#3b4bd8'], changed: ['#f2c27a', '#b7791f'], added: ['#7ee2a0', '#1a7f37'], removed: ['#d3d7de', '#8c959f'], flag: ['#ff9cc2', '#d6336c'] };
  function block(n, g) {
    var p = PAINT[n.role] || PAINT.neutral, id = K.uid('dg'), r = n.kind === 'switch' ? 24 : 38;
    var gr = K.svg('linearGradient', { id: id, x1: 0, y1: 0, x2: 0, y2: 1 }, K.svg('defs', {}, g));
    K.svg('stop', { offset: 0, 'stop-color': p[0] }, gr); K.svg('stop', { offset: 1, 'stop-color': p[1] }, gr);
    K.svg('ellipse', { cx: 6, cy: r + 10, rx: r * 1.15, ry: r * .35, fill: 'rgba(40,30,20,.28)' }, g);
    if (n.kind === 'store') {
      K.svg('path', { d: 'M-34 -16 V22 A34 12 0 0 0 34 22 V-16', fill: 'url(#' + id + ')' }, g);
      K.svg('ellipse', { cx: 0, cy: -16, rx: 34, ry: 12, fill: p[0] }, g);
      return { r: 40 };
    }
    K.svg('rect', { x: -r, y: -r * .7, width: r * 2, height: r * 1.6, rx: 10, fill: 'url(#' + id + ')' }, g);
    K.svg('rect', { x: -r, y: -r * .7 - 12, width: r * 2, height: 16, rx: 8, fill: p[0] }, g);
    var out = { r: r + 4 };
    if (n.kind === 'switch') out.lever = K.svg('line', { x1: 0, y1: -6, x2: 30, y2: -6, stroke: '#2b2118', 'stroke-width': 5, 'stroke-linecap': 'round' }, g);
    return out;
  }
  window.LOOK = {
    name: 'diorama',
    role: { neutral: '#3b4bd8', changed: '#b7791f', added: '#1a7f37', removed: '#8c959f', flag: '#d6336c' },
    boardFilter: false, edgeWidth: 7,
    css: [
      ':root{--stage-bg:#2a2320;--frame-bg:#cdb894;--frame-radius:22px;--frame-shadow:inset 0 0 0 10px #6b4f36,0 40px 80px -30px rgba(0,0,0,.8);',
      '--ink:#2b2118;--heading:#f3e7d3;--chip-bg:rgba(255,255,255,.12);--chip-ink:#f3e7d3;--tag-bg:#f3e7d3;--tag-ink:#2b2118;',
      '--board-bg:#cdb894;--board-border:10px solid #6b4f36;--board-ink:#2b2118;--code-bg:#1e1916;--cap-bg:rgba(20,15,12,.88);--token-ink:#fff}',
      '.ground{background:radial-gradient(900px 500px at 50% 30%,#4a3a30,#1d1714 75%)}',
      '.frame{background-image:repeating-linear-gradient(90deg,rgba(0,0,0,.025) 0 2px,transparent 2px 9px),linear-gradient(#d8c4a0,#bfa67e)}',
      // The tilt lives on the drawing, not on the camera wrapper, so the camera can still move.
      '.flow,.concept{transform:perspective(1100px) rotateX(26deg);transform-origin:50% 60%}',
      '.flabel{font:700 18px/1 var(--mono);fill:#2b2118}.elabel{fill:#4a3a30}',
      '.token rect{fill:#2b2118}'
    ].join(''),
    flowNode: block
  };
})();
