// Infographic: flat, confident colour where every hue is a category,
// and size that encodes a real quantity (node.weight) rather than decoration.
(function () {
  var K = window.KIT, INK = '#22223b';
  var HUE = { neutral: '#4361ee', changed: '#f4a259', added: '#2ec4b6', removed: '#c9c9d6', flag: '#e63977' };
  function tile(n, g) {
    var c = HUE[n.role] || HUE.neutral, s = 54 * Math.sqrt(n.weight || 1);
    if (n.kind === 'switch') {
      K.svg('circle', { r: 24, fill: c }, g);
      return { r: 26, lever: K.svg('line', { x1: 0, y1: 0, x2: 30, y2: 0, stroke: INK, 'stroke-width': 5, 'stroke-linecap': 'round' }, g) };
    }
    K.svg('rect', { x: -s / 2, y: -s / 2, width: s, height: s, rx: 10, fill: c }, g);
    K.svg('rect', { x: -s / 2, y: s / 2 - 8, width: s, height: 8, rx: 4, fill: 'rgba(0,0,0,.12)' }, g);
    return { r: s / 2 + 4 };
  }
  window.LOOK = {
    name: 'infographic',
    role: HUE,
    boardFilter: false, edgeWidth: 6,
    css: [
      ':root{--stage-bg:#f7f7fb;--frame-bg:#ffffff;--frame-radius:18px;--frame-shadow:0 1px 0 rgba(34,34,59,.08);',
      '--ink:' + INK + ';--heading:' + INK + ';--chip-bg:' + INK + ';--chip-ink:#fff;--tag-bg:transparent;--tag-ink:' + INK + ';',
      '--board-bg:#ffffff;--board-border:0 solid transparent;--board-ink:' + INK + ';--code-bg:' + INK + ';--cap-bg:' + INK + ';',
      '--display-weight:900;--display-stretch:110%;--token-ink:#fff}',
      '.ground{background:var(--stage-bg)}',
      '.scene h2{font-weight:900;font-stretch:110%}',
      '.flabel{font:700 19px/1 var(--display);font-stretch:100%}.elabel{font:600 15px/1 var(--mono);fill:#6b6b85}',
      '.fnote{font:700 22px/1 var(--display);color:' + HUE.flag + '}',
      '.token rect{fill:' + INK + '}.morph{background:' + HUE.flag + '}'
    ].join(''),
    flowNode: tile
  };
})();
