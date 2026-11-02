// Humour overlay: live sports coverage. A score bug, a replay stinger at every cut, and per-scene
// lower-thirds from sc.humour. Pair it with a commentator narrator ("narrator": "Commentator").
window.OVERLAY = {
  css: [
    '.bug{position:absolute;right:72px;top:52px;display:flex;align-items:stretch;font:700 15px/1 var(--mono);box-shadow:0 6px 18px rgba(0,0,0,.35)}',
    '.bug b{background:#d7262e;color:#fff;padding:7px 10px;display:flex;align-items:center;gap:6px}',
    '.bug b i{width:8px;height:8px;border-radius:50%;background:#fff;display:block}',
    '.bug span{background:#0d1235;color:#fff;padding:7px 12px}.bug em{font-style:normal;background:#f4d345;color:#0d1235;padding:7px 10px}',
    '.replay{position:absolute;inset:0;pointer-events:none;overflow:hidden}',
    '.replay div{position:absolute;top:-20%;height:140%;width:180px;transform:skewX(-18deg)}',
    '.replay strong{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%);font:900 70px/1 var(--display);font-stretch:110%;',
    'color:#fff;letter-spacing:.06em;text-shadow:0 4px 0 #0d1235;opacity:0}',
    '.l3{position:absolute;left:92px;bottom:112px;padding:8px 14px;background:#f4d345;color:#0d1235;font:800 18px/1 var(--display);',
    'transform:translateY(0);opacity:0;box-shadow:6px 6px 0 #0d1235}'
  ].join(''),
  apply: function (c) {
    var tl = c.tl, R = c.R, o = c.overlay, el = c.el;
    var bug = el('div', 'bug', o), live = el('b', null, bug); el('i', null, live); el('span', null, live, 'LIVE');
    var code = R.scenes.filter(function (s) { return s.type === 'code' && s.stats; })[0];
    el('span', null, bug, R.pr || R.title); if (code) el('em', null, bug, '+' + code.stats.add + ' −' + code.stats.del);
    tl.fromTo(bug, { opacity: 0, x: 20 }, { opacity: 1, x: 0, duration: .4, ease: 'power3.out' }, R.timing.open);
    R.scenes.forEach(function (sc, i) {
      if (i > 0) {
        // Replay stinger: coloured bars sweep across the cut, the way a broadcast hides an edit.
        var rp = el('div', 'replay', o), cols = ['#d7262e', '#0d1235', '#f4d345'];
        cols.forEach(function (col, k) {
          var bar = el('div', null, rp); bar.style.background = col; bar.style.left = '-900px';
          tl.fromTo(bar, { x: -900 - k * 120 }, { x: 1700, duration: .7, ease: 'power3.inOut' }, sc.start - .4 + k * .05);
        });
        var word = el('strong', null, rp, 'REPLAY');
        tl.fromTo(word, { opacity: 0, scale: .9 }, { opacity: 1, scale: 1, duration: .15 }, sc.start - .2).to(word, { opacity: 0, duration: .2 }, sc.start + .15);
      }
      if (sc.humour) {
        var l3 = el('div', 'l3', o, sc.humour);
        tl.fromTo(l3, { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: .4, ease: 'power3.out' }, sc.start + .6)
          .to(l3, { opacity: 0, duration: .3 }, Math.min(sc.end - .3, sc.start + 4));
      }
    });
  }
};
