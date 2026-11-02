// Humour overlay: a wrestling main event. Ring ropes framing the stage, a VS splash, and a title-belt lower-third.
window.OVERLAY = {
  css: [
    '.rope{position:absolute;left:0;right:0;height:5px;border-radius:3px;box-shadow:0 2px 0 rgba(0,0,0,.25)}',
    '.vs{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:900 190px/1 var(--display);font-stretch:70%;',
    'color:#ffd23f;text-shadow:8px 8px 0 #c1121f,16px 16px 0 #0b0b0b;opacity:0}',
    '.belt{position:absolute;left:92px;bottom:112px;padding:9px 18px;border-radius:999px;background:linear-gradient(#ffe27a,#c99a12);',
    'color:#2b1d00;font:900 19px/1 var(--display);font-stretch:85%;border:3px solid #2b1d00;opacity:0}'
  ].join(''),
  apply: function (c) {
    var tl = c.tl, R = c.R, o = c.overlay, el = c.el;
    [['#c1121f', 6], ['#ffffff', 16], ['#1d4ed8', 26]].forEach(function (r) { var a = el('div', 'rope', o); a.style.top = r[1] + 'px'; a.style.background = r[0]; });
    [['#c1121f', 6], ['#ffffff', 16], ['#1d4ed8', 26]].forEach(function (r) { var a = el('div', 'rope', o); a.style.bottom = r[1] + 'px'; a.style.background = r[0]; });
    var vs = el('div', 'vs', o, 'VS');
    tl.fromTo(vs, { opacity: 0, scale: 1.6 }, { opacity: 1, scale: 1, duration: .25, ease: 'power3.in' }, R.timing.open - .5).to(vs, { opacity: 0, duration: .25 }, R.timing.open);
    R.scenes.forEach(function (sc) {
      if (!sc.humour) return;
      var b = el('div', 'belt', o, sc.humour);
      tl.fromTo(b, { opacity: 0, x: -24 }, { opacity: 1, x: 0, duration: .35, ease: 'power3.out' }, sc.start + .6).to(b, { opacity: 0, duration: .3 }, Math.min(sc.end - .3, sc.start + 4));
    });
  }
};
