// Humour overlay for one reel: local radio traffic and travel. A LIVE bug, a scrolling travel ticker,
// per-scene lower-thirds from sc.humour, and an "all clear" chip on the closing card.
window.OVERLAY = {
  css: [
    '.tn-bug{position:absolute;right:72px;top:40px;display:flex;font:800 14px/1 var(--mono);box-shadow:0 6px 16px rgba(0,0,0,.3);opacity:0}',
    '.tn-bug b{background:#e30613;color:#fff;padding:8px 10px}.tn-bug span{background:#14213d;color:#ffd400;padding:8px 12px;letter-spacing:.04em}',
    '.tn-tick{position:absolute;left:0;right:0;top:0;height:26px;background:#ffd400;color:#14213d;overflow:hidden;font:800 13px/26px var(--mono);white-space:nowrap;opacity:0}',
    '.tn-tick div{position:absolute;left:0;top:0}',
    '.tn-l3{position:absolute;left:92px;bottom:112px;display:flex;font:800 18px/1 var(--display);box-shadow:5px 5px 0 #14213d;opacity:0}',
    '.tn-l3 b{background:#14213d;color:#ffd400;padding:9px 12px}.tn-l3 span{background:#fff;color:#14213d;padding:9px 14px}',
    '.tn-clear{position:absolute;right:120px;top:300px;padding:12px 22px;background:#1f9d55;color:#fff;font:900 40px/1 var(--display);border-radius:8px;opacity:0;box-shadow:0 10px 24px rgba(0,0,0,.3)}'
  ].join(''),
  apply: function (c) {
    var tl = c.tl, R = c.R, o = c.overlay, el = c.el;
    var bug = el('div', 'tn-bug', o); el('b', null, bug, 'LIVE'); el('span', null, bug, 'TRAFFIC & TRAVEL');
    tl.fromTo(bug, { opacity: 0, x: 16 }, { opacity: 1, x: 0, duration: .4, ease: 'power3.out' }, R.timing.open);
    var items = (R.humour && R.humour.ticker) || [];
    if (items.length) {
      var tick = el('div', 'tn-tick', o), run = el('div', null, tick, (items.join('   ///   ') + '   ///   ').repeat(4));
      tl.fromTo(tick, { opacity: 0 }, { opacity: 1, duration: .3 }, R.timing.open)
        .fromTo(run, { x: 0 }, { x: -1600, duration: c.total - R.timing.open, ease: 'none' }, R.timing.open);
    }
    R.scenes.forEach(function (sc) {
      if (sc.humour) {
        var l3 = el('div', 'tn-l3', o); el('b', null, l3, 'TRAVEL'); el('span', null, l3, sc.humour);
        tl.fromTo(l3, { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: .4, ease: 'power3.out' }, sc.start + .5).to(l3, { opacity: 0, duration: .3 }, Math.min(sc.end - .3, sc.start + 4.5));
      }
      if (sc.type === 'card') {
        var clr = el('div', 'tn-clear', o, 'ALL CLEAR');
        tl.fromTo(clr, { opacity: 0, scale: 1.4 }, { opacity: 1, scale: 1, duration: .3, ease: 'power3.out' }, sc.start + 1);
      }
    });
  }
};
