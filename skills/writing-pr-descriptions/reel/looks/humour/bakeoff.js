// Humour overlay: a baking competition. Bunting along the top, challenge cards per scene, a rosette on the closing card.
window.OVERLAY = {
  css: [
    '.bunting{position:absolute;left:0;right:0;top:0;height:40px}',
    '.chal{position:absolute;left:92px;bottom:112px;padding:8px 16px;background:#fff8ee;color:#7a2e4a;border:2px solid #e8a0b4;border-radius:10px;',
    'font:italic 600 21px/1 Georgia,serif;opacity:0}',
    '.rosette{position:absolute;right:120px;top:270px;width:150px;height:150px;opacity:0}'
  ].join(''),
  apply: function (c) {
    var tl = c.tl, R = c.R, o = c.overlay, el = c.el, K = c.K;
    var s = K.svg('svg', { class: 'bunting', viewBox: '0 0 1280 40', width: 1280, height: 40 }, o);
    K.svg('path', { d: 'M0 4 Q640 18 1280 4', stroke: '#7a2e4a', 'stroke-width': 2, fill: 'none' }, s);
    var cols = ['#e8a0b4', '#9ad1d4', '#f6d27a', '#b5d99c'];
    for (var i = 0; i < 26; i++) {
      var x = 10 + i * 49, y = 4 + 14 * Math.sin(Math.PI * x / 1280);
      K.svg('path', { d: 'M' + x + ' ' + y + ' l34 0 l-17 26 z', fill: cols[i % 4] }, s);
    }
    R.scenes.forEach(function (sc) {
      if (sc.humour) {
        var ch = el('div', 'chal', o, sc.humour);
        tl.fromTo(ch, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: .4, ease: 'power3.out' }, sc.start + .6).to(ch, { opacity: 0, duration: .3 }, Math.min(sc.end - .3, sc.start + 4));
      }
      if (sc.type === 'card') {
        var r = K.svg('svg', { class: 'rosette', viewBox: '-75 -75 150 150' }, o);
        for (var k = 0; k < 16; k++) { var a = k * Math.PI / 8; K.svg('circle', { cx: Math.cos(a) * 46, cy: Math.sin(a) * 46, r: 22, fill: k % 2 ? '#2a6fdb' : '#4f8ff0' }, r); }
        K.svg('circle', { r: 44, fill: '#f6d27a' }, r);
        var t = K.svg('text', { y: 7, 'text-anchor': 'middle', 'font-family': 'Georgia, serif', 'font-weight': 700, 'font-size': 18, fill: '#7a2e4a' }, r); t.textContent = 'Star diff';
        tl.fromTo(r, { opacity: 0, rotation: -40, svgOrigin: '0 0' }, { opacity: 1, rotation: 0, duration: .6, ease: 'expo.out' }, sc.start + 1.2);
      }
    });
  }
};
