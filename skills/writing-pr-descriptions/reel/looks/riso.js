// Riso: a two-ink risograph print. Bold geometric characters overprinted in blue and fluoro pink, slightly off register.
(function () {
  var K = window.KIT, BLUE = '#3255a4', PINK = '#ff48b0', YEL = '#ffe800';
  var SHAPE = {
    neutral: 'M-60 170 C-60 80 -40 40 0 40 C40 40 60 80 60 170 Z',
    changed: 'M-64 170 V60 Q-64 40 -44 40 H44 Q64 40 64 60 V170 Z',
    added: 'M-44 170 V30 Q-44 -6 0 -6 Q44 -6 44 30 V170 Z',
    removed: 'M-66 170 L0 50 L66 170 Z',
    flag: 'M-6 170 V-30 H6 V170 Z'
  };
  function ink(g, d, fill, dx, dy, op) {
    return K.svg('path', { d: d, fill: fill, transform: 'translate(' + (dx || 0) + ' ' + (dy || 0) + ')', opacity: op == null ? .92 : op, style: 'mix-blend-mode:multiply' }, g);
  }
  function figure(role) {
    var s = K.svg('svg', { width: 240, height: 290, viewBox: '-120 -110 240 290' }), g = K.svg('g', {}, s);
    var body = SHAPE[role] || SHAPE.neutral, pinkBody = role === 'added' || role === 'flag';
    ink(g, body, pinkBody ? PINK : BLUE, 0, 0, role === 'removed' ? .45 : .92);
    ink(g, body, pinkBody ? BLUE : PINK, 3, 2, .18);
    var hy = role === 'added' ? -40 : role === 'flag' ? -40 : 4, hx = role === 'flag' ? -40 : 0;
    if (role === 'flag') { ink(g, 'M6 -30 L90 -2 L6 26 Z', PINK); ink(g, 'M6 -30 L90 -2 L6 26 Z', YEL, 4, 3, .6); }
    var head = 'M' + (hx - 38) + ' ' + hy + ' a38 38 0 1 0 76 0 a38 38 0 1 0 -76 0';
    ink(g, head, YEL, 0, 0, .95);
    var eyes = K.svg('g', {}, g), pupils = [];
    [-13, 13].forEach(function (dx) { pupils.push(K.svg('circle', { cx: hx + dx, cy: hy - 4, r: 5.5, fill: BLUE }, eyes)); });
    if (role === 'added') K.svg('rect', { x: hx - 28, y: hy - 14, width: 56, height: 16, rx: 6, fill: BLUE }, g);
    var mouth = K.svg('ellipse', { cx: hx, cy: hy + 18, rx: 10, ry: 2.5, fill: BLUE }, g);
    return { svg: s, body: g, eyes: eyes, pupils: pupils, mouth: mouth, mouthRy: [2.5, 7] };
  }

  window.LOOK = {
    name: 'riso',
    role: { neutral: BLUE, changed: '#7a5ac8', added: PINK, removed: '#8e98b8', flag: '#e0399a' },
    boardFilter: false,
    css: [
      ':root{--stage-bg:#f6f8fb;--frame-bg:#fff;--frame-radius:4px;--frame-shadow:6px 6px 0 ' + PINK + ',0 0 0 3px ' + BLUE + ';',
      '--ink:' + BLUE + ';--heading:' + BLUE + ';--chip-bg:' + YEL + ';--chip-ink:' + BLUE + ';--tag-bg:' + YEL + ';--tag-ink:' + BLUE + ';',
      '--board-bg:#fff;--board-border:3px solid ' + BLUE + ';--board-ink:' + BLUE + ';--code-bg:' + BLUE + ';--code-ink:#eef2ff;',
      '--cap-bg:' + BLUE + ';--cap-radius:4px;--display-stretch:125%;--display-weight:900}',
      '.ground{background:var(--stage-bg)}',
      '.scene h2{font-weight:900;font-stretch:125%;font-size:40px}',
      '.hook .big,.card .big{font-size:88px}.hook .big span:last-child,.card .big span:last-child{color:' + PINK + '}',
      '.card .big{font-size:72px}',
      '.card .sub{color:' + BLUE + '}',
      '.chalkline{font:900 46px/1 var(--display);font-stretch:125%}',
      '.stick{background:' + PINK + ';height:46px;width:8px}',
      '.tag{border-radius:2px;font-weight:500}',
      '.spot{background:radial-gradient(circle at 50% 60%,rgba(255,232,0,.55) 0,rgba(255,232,0,.55) 30%,transparent 31%)}',
      '.parcel{background:' + PINK + ';color:#fff;border-radius:2px}',
      '.avatar{background:' + PINK + ';box-shadow:5px 4px 0 ' + BLUE + '}',
      '.app{border:3px solid ' + BLUE + ';border-radius:4px;box-shadow:6px 6px 0 ' + YEL + '}',
      '.btn{background:' + BLUE + ';border-radius:2px}'
    ].join(''),
    actor: function (role) { return figure(role); }
  };
})();
