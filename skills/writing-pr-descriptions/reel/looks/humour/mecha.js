// Humour overlay: a giant-robot cockpit. HUD corner brackets, system readouts per scene, and hazard stripes at every cut.
window.OVERLAY = {
  css: [
    '.hud{position:absolute;inset:14px;pointer-events:none}',
    '.hud i{position:absolute;width:46px;height:46px;border-color:#2ef2ff;border-style:solid;opacity:.8}',
    '.readout{position:absolute;left:92px;bottom:112px;padding:6px 12px;border:1px solid #2ef2ff;color:#2ef2ff;background:rgba(0,20,30,.75);',
    'font:600 15px/1.4 var(--mono);letter-spacing:.06em;opacity:0}',
    '.hazard{position:absolute;left:0;right:0;top:300px;height:70px;background:repeating-linear-gradient(-45deg,#ffcc00 0 26px,#111 26px 52px);opacity:0}',
    '.hazard b{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:900 30px/1 var(--mono);color:#fff;',
    'text-shadow:0 0 6px #000;letter-spacing:.2em}'
  ].join(''),
  apply: function (c) {
    var tl = c.tl, R = c.R, o = c.overlay, el = c.el;
    var hud = el('div', 'hud', o);
    [['0', '0', '3px 0 0 3px'], ['0', 'auto', '3px 3px 0 0'], ['auto', '0', '0 0 3px 3px'], ['auto', 'auto', '0 3px 3px 0']].forEach(function (p, i) {
      var b = el('i', null, hud); b.style.borderWidth = p[2];
      if (i < 2) b.style.top = '0'; else b.style.bottom = '0';
      if (i % 2 === 0) b.style.left = '0'; else b.style.right = '0';
    });
    R.scenes.forEach(function (sc, i) {
      if (sc.humour) {
        var r = el('div', 'readout', o, '> ' + sc.humour);
        tl.fromTo(r, { opacity: 0 }, { opacity: 1, duration: .2 }, sc.start + .6).to(r, { opacity: 0, duration: .2 }, Math.min(sc.end - .3, sc.start + 4));
      }
      if (i > 0) {
        var h = el('div', 'hazard', o); el('b', null, h, 'MODULE SWAP');
        tl.fromTo(h, { opacity: 0, scaleY: .2 }, { opacity: 1, scaleY: 1, duration: .15 }, sc.start - .35).to(h, { opacity: 0, duration: .15 }, sc.start + .15);
      }
    });
  }
};
