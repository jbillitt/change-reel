// Dusk: dark ground, clean geometry, one colour per idea held all reel,
// and values that visibly transform into each other.
(function () {
  var K = window.KIT, BLUE = '#58c4dd', YELLOW = '#f4d345', GREEN = '#83c167', RED = '#fc6255', GREY = '#888888', TEAL = '#5cd0b3';
  function node(n, g, colour) {
    var c = { neutral: BLUE, changed: YELLOW, added: GREEN, removed: GREY, flag: TEAL }[n.role || 'neutral'] || BLUE;
    var r = n.kind === 'switch' ? 24 : 40;
    if (n.kind === 'store') K.svg('rect', { x: -44, y: -32, width: 88, height: 64, rx: 6, fill: c, 'fill-opacity': .18, stroke: c, 'stroke-width': 4 }, g);
    else K.svg('circle', { r: r, fill: c, 'fill-opacity': .18, stroke: c, 'stroke-width': 4 }, g);
    var out = { r: n.kind === 'store' ? 44 : r };
    if (n.kind === 'switch') out.lever = K.svg('line', { x1: 0, y1: 0, x2: 30, y2: 0, stroke: '#fff', 'stroke-width': 4, 'stroke-linecap': 'round' }, g);
    else K.svg('circle', { r: 5, fill: c }, g);
    return out;
  }
  window.LOOK = {
    name: 'dusk',
    role: { neutral: BLUE, changed: YELLOW, added: GREEN, removed: GREY, flag: TEAL },
    boardFilter: false, edgeWidth: 4,
    css: [
      ':root{--stage-bg:#1c1c1c;--frame-bg:#1c1c1c;--frame-radius:0;--frame-shadow:none;--ink:#ece6e2;--heading:#ece6e2;',
      '--chip-bg:rgba(255,255,255,.08);--chip-ink:#ece6e2;--tag-bg:transparent;--tag-ink:#ece6e2;--board-bg:#1c1c1c;--board-border:0 solid transparent;',
      '--board-ink:#ece6e2;--code-bg:#141414;--cap-bg:rgba(0,0,0,.7);--cap-radius:6px;--display-weight:600;--display-stretch:100%;--token-ink:#1c1c1c}',
      '.ground{background:#1c1c1c}',
      '.scene h2{font-weight:500;font-stretch:100%}',
      '.flabel{font:500 20px/1 var(--display);fill:#ece6e2}.elabel{fill:#bbbbbb}',
      '.token rect{fill:' + YELLOW + '}.morph{background:transparent;border:2px solid ' + YELLOW + ';color:' + YELLOW + '}',
      '.fnote{font:500 22px/1 var(--display);color:' + TEAL + '}',
      '.chalkline{font:500 40px/1 var(--display)}.stick{background:' + YELLOW + ';width:4px;height:40px}'
    ].join(''),
    flowNode: node
  };
})();
