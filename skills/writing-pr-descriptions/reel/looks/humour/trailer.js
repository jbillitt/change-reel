// Humour overlay: a film trailer. Heavy letterbox, a rating card on the cold open, and title cards between scenes from
// sc.humour ("This autumn...", "One flag. Two routes."). Homage to the genre; never quote or copy a real film.
window.OVERLAY = {
  css: [
    '.lbx{position:absolute;left:0;right:0;height:46px;background:#000}',
    '.rating{position:absolute;left:72px;top:70px;padding:10px 14px;border:2px solid #fff;color:#fff;background:#0a7a33;font:700 15px/1.35 var(--mono);opacity:0}',
    '.tcard{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#000;color:#fff;',
    'font:700 54px/1.1 Georgia,"Times New Roman",serif;letter-spacing:.08em;text-transform:uppercase;opacity:0;text-align:center;padding:0 120px}'
  ].join(''),
  apply: function (c) {
    var tl = c.tl, R = c.R, o = c.overlay, el = c.el;
    var t = el('div', 'lbx', o), b = el('div', 'lbx', o); t.style.top = '0'; b.style.bottom = '0';
    var r = el('div', 'rating', o, 'THE FOLLOWING PREVIEW HAS BEEN APPROVED FOR ALL REVIEWERS');
    tl.fromTo(r, { opacity: 0 }, { opacity: 1, duration: .3 }, .1).to(r, { opacity: 0, duration: .3 }, R.timing.open - .6);
    R.scenes.forEach(function (sc, i) {
      if (!sc.humour || i === 0) return;
      // A one-beat title card over the cut, the way a trailer punctuates its montage.
      var card = el('div', 'tcard', o, sc.humour);
      tl.fromTo(card, { opacity: 0 }, { opacity: 1, duration: .2 }, sc.start - .3).to(card, { opacity: 0, duration: .3 }, sc.start + .9);
    });
  }
};
