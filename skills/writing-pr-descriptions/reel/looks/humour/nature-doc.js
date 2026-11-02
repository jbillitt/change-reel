// Humour overlay: a wildlife documentary. Letterbox, a little film grain, and a serif lower-third per scene
// from sc.humour (for example "Resizus bffii, in its natural habitat"). Pair it with a hushed narrator.
window.OVERLAY = {
  css: [
    '.lb{position:absolute;left:0;right:0;height:26px;background:#000}',
    '.grain{position:absolute;inset:0;opacity:.09;mix-blend-mode:multiply}',
    '.l3n{position:absolute;left:92px;bottom:112px;color:#fff;font:italic 600 30px/1.1 Georgia,"Times New Roman",serif;',
    'text-shadow:0 2px 8px rgba(0,0,0,.6);opacity:0}.l3n small{display:block;font:500 15px/1.4 var(--mono);font-style:normal;opacity:.8}'
  ].join(''),
  apply: function (c) {
    var tl = c.tl, R = c.R, o = c.overlay, el = c.el, K = c.K;
    var g = K.svg('svg', { class: 'grain', viewBox: '0 0 1280 720', width: 1280, height: 720 }, o);
    var f = K.svg('filter', { id: 'grainf' }, g);
    K.svg('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.9', numOctaves: 2, seed: 9 }, f);
    K.svg('rect', { width: 1280, height: 720, filter: 'url(#grainf)' }, g);
    var top = el('div', 'lb', o), bot = el('div', 'lb', o); top.style.top = '0'; bot.style.bottom = '0';
    R.scenes.forEach(function (sc) {
      if (!sc.humour) return;
      var parts = String(sc.humour).split('|'), l3 = el('div', 'l3n', o, parts[0]);
      if (parts[1]) el('small', null, l3, parts[1]);
      tl.fromTo(l3, { opacity: 0 }, { opacity: 1, duration: .8, ease: 'power2.out' }, sc.start + .5)
        .to(l3, { opacity: 0, duration: .6 }, Math.min(sc.end - .4, sc.start + 4.5));
    });
  }
};
