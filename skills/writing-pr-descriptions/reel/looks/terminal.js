// Terminal: a CRT in green phosphor. Robots drawn in vector outline with LED faces; everything is monospace.
(function () {
  var K = window.KIT, G = '#39ff7a', DIM = '#1f8f47', AMB = '#ffcf4a', RED = '#ff6b6b';
  var COL = { neutral: G, changed: AMB, added: '#9dffc2', removed: DIM, flag: '#ff7ad1' };
  function bot(role) {
    var c = COL[role] || G, s = K.svg('svg', { width: 230, height: 260, viewBox: '0 0 230 260', fill: 'none', stroke: c, 'stroke-width': 3,
      'stroke-linejoin': 'round', 'stroke-linecap': 'round', filter: 'url(#glow)' });
    var g = K.svg('g', {}, s), dash = role === 'removed' ? '6 6' : 'none';
    K.svg('path', { d: 'M115 40 V16', 'stroke-dasharray': dash }, g); var ant = K.svg('circle', { cx: 115, cy: 12, r: 6, fill: c }, g);
    if (role === 'flag') {
      K.svg('path', { d: 'M70 236 V40 M70 40 L170 70 L70 100', 'stroke-dasharray': dash }, g);
      K.svg('rect', { x: 40, y: 150, width: 60, height: 50, rx: 8 }, g);
    } else {
      K.svg('rect', { x: 50, y: 40, width: 130, height: 100, rx: 14, 'stroke-dasharray': dash }, g);
      K.svg('rect', { x: 40, y: 150, width: 150, height: 80, rx: 10, 'stroke-dasharray': dash }, g);
      K.svg('path', { d: 'M62 176 h40 M62 196 h70', opacity: .7 }, g);
      if (role === 'changed') K.svg('text', { x: 150, y: 206, fill: AMB, stroke: 'none', 'font-family': 'JetBrains Mono', 'font-size': 26 }, g).textContent = '~';
      if (role === 'added') K.svg('text', { x: 150, y: 206, fill: c, stroke: 'none', 'font-family': 'JetBrains Mono', 'font-size': 26 }, g).textContent = '+';
    }
    var fx = role === 'flag' ? 70 : 115, fy = role === 'flag' ? 175 : 86;
    var eyes = K.svg('g', {}, g), pupils = [];
    [-22, 22].forEach(function (dx) { pupils.push(K.svg('rect', { x: fx + dx - 7, y: fy - 16, width: 14, height: 16, rx: 2, fill: c, stroke: 'none' }, eyes)); });
    var mouth = K.svg('ellipse', { cx: fx, cy: fy + 18, rx: 20, ry: 2, fill: c, stroke: 'none' }, g);
    return { svg: s, body: g, eyes: eyes, pupils: pupils, mouth: mouth, mouthRy: [2, 7],
      speak: function (tl, start, len) { tl.to(ant, { attr: { r: 9 }, duration: .15 }, start).to(ant, { attr: { r: 6 }, duration: .3 }, start + len); } };
  }
  window.LOOK = {
    name: 'terminal',
    role: COL,
    boardFilter: false,
    css: [
      ':root{--stage-bg:#030803;--frame-bg:#041004;--frame-radius:18px;--frame-shadow:0 0 0 2px ' + DIM + ',0 0 40px rgba(57,255,122,.15);',
      '--ink:' + G + ';--token-ink:#030803;--heading:' + G + ';--chip-bg:rgba(57,255,122,.12);--chip-ink:' + G + ';--tag-bg:transparent;--tag-ink:' + G + ';',
      '--board-bg:#041004;--board-border:2px solid ' + DIM + ';--board-ink:' + G + ';--code-bg:#020802;--code-ink:#b8ffcf;',
      '--cap-bg:rgba(2,12,4,.92);--cap-ink:' + G + ';--cap-dim:rgba(57,255,122,.35);--display:"JetBrains Mono",monospace;--body:"JetBrains Mono",monospace;',
      '--display-stretch:100%;--display-weight:500}',
      '.layer{text-shadow:0 0 6px rgba(57,255,122,.45)}',
      '.overlay{background:repeating-linear-gradient(rgba(0,0,0,.28) 0 2px,transparent 2px 4px),radial-gradient(ellipse at 50% 50%,transparent 60%,rgba(0,0,0,.6))}',
      '.scene h2{font:500 34px/1 var(--mono)}.scene h2:before{content:"$ "}',
      '.hook .big{font-size:76px;line-height:1.05}.card .big{font-size:62px;line-height:1.05}',
      '.tag{border:1.5px solid ' + DIM + ';border-radius:4px}',
      '.floor{background:' + DIM + '}',
      '.spot{background:radial-gradient(ellipse at 50% 70%,rgba(57,255,122,.14),transparent 62%)}',
      '.chalkline{font:500 38px/1 var(--mono)}.chalkline:before{content:"> "}',
      '.stick{width:20px;height:38px;border-radius:0;background:' + G + ';box-shadow:none}',
      '.cap .who{color:#031;background:' + G + ' !important}',
      '.parcel{background:transparent;border:2px solid ' + G + ';color:' + G + '}',
      '.app{background:#041004;border:2px solid ' + DIM + ';color:' + G + '}.app h3{font-family:var(--mono)}',
      '.status.before{background:transparent;border:1.5px solid ' + G + ';color:' + G + '}',
      '.status.after{background:' + G + ';color:#031}',
      '.btn{background:transparent;border:2px solid ' + G + ';color:' + G + '}',
      '.avatar{background:transparent;border:2px solid ' + G + ';color:' + G + '}',
      '.cursor path{fill:' + G + ';stroke:#031}',
      '.row.del{color:' + RED + '}'
    ].join(''),
    actor: function (role) { return bot(role); }
  };
})();
