// Humour overlay: a heist film. A case-file stamp, "Exhibit" tags per scene from sc.humour, and a cooler, grainier grade.
window.OVERLAY = {
  css: [
    '#scenes{filter:saturate(.75) contrast(1.05)}',
    '.case{position:absolute;right:72px;top:50px;padding:6px 12px;border:3px solid #c0262d;color:#c0262d;font:800 17px/1 var(--mono);',
    'transform:rotate(-6deg);letter-spacing:.08em;opacity:0;background:rgba(255,255,255,.85)}',
    '.exhibit{position:absolute;left:92px;bottom:112px;padding:8px 12px;background:#111;color:#f2e6c9;font:700 17px/1 var(--mono);opacity:0}'
  ].join(''),
  apply: function (c) {
    var tl = c.tl, R = c.R, o = c.overlay, el = c.el;
    var stamp = el('div', 'case', o, 'CASE FILE ' + (R.pr || R.title));
    tl.fromTo(stamp, { opacity: 0, scale: 1.6 }, { opacity: 1, scale: 1, duration: .25, ease: 'power3.in' }, R.timing.open + .3);
    R.scenes.forEach(function (sc, i) {
      if (!sc.humour) return;
      var ex = el('div', 'exhibit', o, 'EXHIBIT ' + String.fromCharCode(65 + i) + ' · ' + sc.humour);
      tl.fromTo(ex, { opacity: 0, x: -14 }, { opacity: 1, x: 0, duration: .35, ease: 'power3.out' }, sc.start + .5)
        .to(ex, { opacity: 0, duration: .3 }, Math.min(sc.end - .3, sc.start + 4));
    });
  }
};
