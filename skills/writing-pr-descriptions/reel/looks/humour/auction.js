// Humour overlay: an auction house. A lot placard, the diff as the current bid, and SOLD on the closing card.
window.OVERLAY = {
  css: [
    '.lot{position:absolute;right:72px;top:50px;padding:8px 14px;background:#1d1a16;color:#f3e3b5;font:700 16px/1.2 Georgia,serif;letter-spacing:.06em;opacity:0}',
    '.lot b{display:block;font:500 13px/1 var(--mono);letter-spacing:0;color:#d8c48a;margin-top:4px}',
    '.bidl3{position:absolute;left:92px;bottom:112px;padding:8px 14px;background:#f3e3b5;color:#1d1a16;font:italic 600 20px/1 Georgia,serif;opacity:0}',
    '.sold{position:absolute;right:120px;top:300px;padding:10px 26px;border:6px solid #b3261e;color:#b3261e;font:900 64px/1 var(--display);',
    'transform:rotate(-10deg);opacity:0;background:rgba(255,255,255,.85)}'
  ].join(''),
  apply: function (c) {
    var tl = c.tl, R = c.R, o = c.overlay, el = c.el;
    var code = R.scenes.filter(function (s) { return s.type === 'code' && s.stats; })[0];
    var lot = el('div', 'lot', o, 'LOT ' + (R.pr || R.title)); el('b', null, lot, code ? 'Current bid +' + code.stats.add + ' / −' + code.stats.del : 'Bidding now open');
    tl.fromTo(lot, { opacity: 0, y: -10 }, { opacity: 1, y: 0, duration: .4, ease: 'power3.out' }, R.timing.open);
    R.scenes.forEach(function (sc) {
      if (sc.humour) {
        var l3 = el('div', 'bidl3', o, sc.humour);
        tl.fromTo(l3, { opacity: 0 }, { opacity: 1, duration: .4 }, sc.start + .6).to(l3, { opacity: 0, duration: .3 }, Math.min(sc.end - .3, sc.start + 4));
      }
      if (sc.type === 'card') {
        var sold = el('div', 'sold', o, 'SOLD');
        tl.fromTo(sold, { opacity: 0, scale: 1.8 }, { opacity: 1, scale: 1, duration: .22, ease: 'power3.in' }, sc.start + 1.2);
      }
    });
  }
};
