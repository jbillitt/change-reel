// Humour overlay: an awards ceremony. Gold nominee captions, sweeping spotlights, and an envelope on the closing card.
window.OVERLAY = {
  css: [
    '.beam{position:absolute;top:-80px;width:340px;height:900px;margin-left:-170px;background:linear-gradient(rgba(255,226,140,.28),transparent 80%);',
    'transform-origin:50% 0;filter:blur(6px);mix-blend-mode:screen;pointer-events:none}',
    '.nominee{position:absolute;left:92px;bottom:112px;padding:8px 16px;background:#14110a;color:#f3d27a;border:1px solid #c9a24a;',
    'font:600 15px/1.3 var(--mono);opacity:0}.nominee b{display:block;font:italic 700 20px/1.1 Georgia,serif;color:#fff2c9}',
    '.envelope{position:absolute;right:110px;top:280px;padding:16px 22px;background:#c9a24a;color:#14110a;font:italic 700 22px/1.2 Georgia,serif;',
    'box-shadow:0 18px 40px -12px rgba(0,0,0,.6);opacity:0;transform:rotate(4deg)}'
  ].join(''),
  apply: function (c) {
    var tl = c.tl, R = c.R, o = c.overlay, el = c.el;
    [260, 1020].forEach(function (x, i) {
      var b = el('div', 'beam', o); b.style.left = x + 'px';
      tl.fromTo(b, { rotation: i ? 18 : -18 }, { rotation: i ? -14 : 14, duration: R.timing.open + 2, ease: 'sine.inOut' }, 0)
        .to(b, { opacity: 0, duration: .6 }, R.timing.open + 1.4);
    });
    R.scenes.forEach(function (sc) {
      if (sc.humour) {
        var n = el('div', 'nominee', o, 'Nominated for'); el('b', null, n, sc.humour);
        tl.fromTo(n, { opacity: 0 }, { opacity: 1, duration: .4 }, sc.start + .6).to(n, { opacity: 0, duration: .3 }, Math.min(sc.end - .3, sc.start + 4));
      }
      if (sc.type === 'card') {
        var e = el('div', 'envelope', o, 'And the award goes to... the diff.');
        tl.fromTo(e, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: .5, ease: 'power3.out' }, sc.start + 1.2);
      }
    });
  }
};
