// Blueprint: an engineering drawing. Services are line-art machines; notes are handwritten; a title block names the PR.
(function () {
  var K = window.KIT, INK = '#e8f1ff';
  var ROLE = { neutral: '#e8f1ff', changed: '#ffd58a', added: '#9ff0bf', removed: '#9fb2d6', flag: '#ffb3d1' };

  function machine(role) {
    var c = ROLE[role] || INK, s = K.svg('svg', { width: 230, height: 250, viewBox: '0 0 230 250', fill: 'none', stroke: c,
      'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
    if (role === 'added') s.setAttribute('filter', 'url(#glow)');
    var body = K.svg('g', {}, s), dash = role === 'removed' ? '8 8' : 'none';
    K.svg('path', { d: 'M60 236 L80 200 M170 236 L150 200 M40 236 H190' }, body);
    if (role === 'flag') {
      K.svg('circle', { cx: 115, cy: 196, r: 30 }, body);
      K.svg('path', { d: 'M115 196 L150 70' }, body);
      K.svg('path', { d: 'M150 70 L210 92 L150 116 Z', fill: 'rgba(255,179,209,.25)' }, body);
    } else {
      K.svg('rect', { x: 30, y: 60, width: 170, height: 140, rx: role === 'added' ? 26 : 10, 'stroke-dasharray': dash }, body);
      if (role === 'changed') {
        K.svg('circle', { cx: 85, cy: 150, r: 26 }, body); K.svg('circle', { cx: 85, cy: 150, r: 7 }, body);
        K.svg('circle', { cx: 150, cy: 158, r: 16 }, body);
        K.svg('path', { d: 'M85 118 v-6 M85 182 v6 M53 150 h-6 M117 150 h6' }, body);
      } else if (role === 'added') {
        K.svg('path', { d: 'M54 150 h80 M54 168 h110 M54 186 h60', opacity: .8 }, body);
        K.svg('circle', { cx: 176, cy: 176, r: 12 }, body);
      } else {
        K.svg('path', { d: 'M54 156 h120 M54 174 h80', opacity: .7, 'stroke-dasharray': dash }, body);
      }
    }
    // A small display with two dot-eyes gives each machine a face.
    var screen = K.svg('rect', { x: role === 'flag' ? 92 : 62, y: role === 'flag' ? 128 : 78, width: role === 'flag' ? 46 : 106, height: 40, rx: 8,
      fill: 'rgba(232,241,255,.06)' }, body);
    var ex = role === 'flag' ? [106, 124] : [98, 132], ey = role === 'flag' ? 148 : 98;
    var eyes = K.svg('g', {}, body), pupils = [];
    ex.forEach(function (x) { pupils.push(K.svg('circle', { cx: x, cy: ey, r: 5, fill: c, stroke: 'none' }, eyes)); });
    var lamp = K.svg('circle', { cx: role === 'flag' ? 115 : 186, cy: role === 'flag' ? 196 : 74, r: 6, fill: c, stroke: 'none', opacity: .25 }, body);
    var wave = K.svg('path', { d: 'M' + (role === 'flag' ? 100 : 100) + ' ' + (ey + 14) + ' h30', 'stroke-width': 3 }, body);
    return {
      svg: s, body: body, eyes: eyes, pupils: pupils,
      speak: function (tl, start, len) {
        for (var t = start, k = 0; t < start + len - .1; t += .16, k++) {
          tl.to(lamp, { opacity: 1, duration: .05 }, t).to(lamp, { opacity: .35, duration: .08 }, t + .08);
          tl.to(wave, { scaleY: 1 + (k % 3), transformOrigin: '50% 50%', duration: .07 }, t).to(wave, { scaleY: 1, duration: .07 }, t + .08);
        }
        tl.to(screen, { attr: { fill: 'rgba(232,241,255,.16)' }, duration: .2 }, start).to(screen, { attr: { fill: 'rgba(232,241,255,.06)' }, duration: .3 }, start + len);
      }
    };
  }

  window.LOOK = {
    name: 'blueprint',
    role: ROLE,
    boardFilter: false,
    css: [
      ':root{--stage-bg:#0b2c63;--frame-bg:rgba(255,255,255,.035);--frame-radius:8px;--frame-shadow:0 0 0 2px rgba(232,241,255,.55);',
      '--ink:#e8f1ff;--token-ink:#0b2c63;--heading:#e8f1ff;--chip-bg:rgba(232,241,255,.12);--chip-ink:#e8f1ff;--tag-bg:transparent;--tag-ink:#e8f1ff;',
      '--board-bg:rgba(255,255,255,.035);--board-border:2px dashed rgba(232,241,255,.5);--board-ink:#e8f1ff;',
      '--code-bg:#071d45;--cap-bg:rgba(5,22,58,.9);--cap-radius:6px;--display-weight:700}',
      '.ground{background:linear-gradient(rgba(255,255,255,.09) 1px,transparent 1px) 0 0/120px 120px,',
      'linear-gradient(90deg,rgba(255,255,255,.09) 1px,transparent 1px) 0 0/120px 120px,',
      'linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px) 0 0/24px 24px,',
      'linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px) 0 0/24px 24px,',
      'radial-gradient(1000px 700px at 45% 40%,#1a4f9c,#0b2c63 75%)}',
      '.scene h2{font:600 54px/1 var(--hand);letter-spacing:0}',
      '.tag{border:1.5px solid rgba(232,241,255,.6);font-family:var(--hand);font-size:24px;font-weight:600}',
      '.parcel{background:transparent;border:2px solid #9ff0bf;color:#9ff0bf;box-shadow:0 0 18px rgba(159,240,191,.35)}',
      '.floor{background:none;border-top:2px dashed rgba(232,241,255,.4)}',
      '.spot{background:radial-gradient(ellipse at 50% 70%,rgba(159,240,191,.18),transparent 62%)}',
      '.stick{background:#e8f1ff}',
      '.app{background:transparent;border:2px solid rgba(232,241,255,.7);color:#e8f1ff}',
      '.btn{background:transparent;border:2px solid #e8f1ff}',
      '.status.before{background:transparent;border:2px solid #9fb2d6;color:#e8f1ff}',
      '.status.after{background:transparent;border:2px solid #9ff0bf;color:#9ff0bf}',
      '.avatar{background:transparent;border:3px solid #e8f1ff;color:#e8f1ff}',
      '.cursor path{fill:#e8f1ff;stroke:#0b2c63}',
      '.tblock{position:absolute;right:18px;top:16px;display:grid;grid-template-columns:auto auto;border:1.5px solid rgba(232,241,255,.7);',
      'font:500 12px/1.3 var(--mono);color:#e8f1ff}.tblock div{padding:4px 9px;border:1px solid rgba(232,241,255,.3)}'
    ].join(''),
    actor: function (role) { return machine(role); },
    castSet: function (world, sc) {
      K.el('div', 'floor', world);
      var R = window.REEL, tb = K.el('div', 'tblock', world);
      var code = R.scenes.filter(function (s) { return s.type === 'code' && s.stats; })[0];
      [['PR', R.pr || '-'], ['TITLE', R.title], ['DIFF', code ? '+' + code.stats.add + ' −' + code.stats.del : '-'],
        ['SHEET', (R.scenes.indexOf(sc) + 1) + ' / ' + R.scenes.length]].forEach(function (r) { K.el('div', null, tb, r[0]); K.el('div', null, tb, r[1]); });
    }
  };
})();
