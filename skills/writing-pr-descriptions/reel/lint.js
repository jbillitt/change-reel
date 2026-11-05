// Frame lint, loaded into snapshots only. After every seek it measures each visible text element of the frame on
// screen and marks, on the snapshot itself: overlaps, text off the frame or below the caption line, clipped text,
// and a label shown before the voice names it. REEL_LINT=0 turns it off.
(function () {
  var R = window.REEL, CAP_Y = 900, STOP = /^(the|and|with|from|that|this|then|into|when|what|they|their|there|still|only|just|also|your|over|under|after|before|now|new|old)$/;
  var norm = function (s) { return String(s).toLowerCase().replace(/[^a-z0-9-]/g, ''); };
  var layer = document.createElement('div');
  layer.style.cssText = 'position:absolute;left:0;top:0;width:1920px;height:1080px;pointer-events:none;z-index:2147483647';

  function opacity(el) {
    for (var o = 1; el && el.nodeType === 1; el = el.parentNode) {
      var cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return 0;
      o *= parseFloat(cs.opacity);
    }
    return o;
  }
  // Elements that hold their own text: a label, not a wrapper around labels.
  function texts(root) {
    var out = [];
    root.querySelectorAll('*').forEach(function (el) {
      if (/^(SCRIPT|STYLE|TEMPLATE|CANVAS)$/.test(el.tagName)) return;
      for (var n = el.firstChild; n; n = n.nextSibling) if (n.nodeType === 3 && n.textContent.trim()) { out.push(el); return; }
    });
    return out;
  }

  function lint(t) {
    var sc = R.scenes.filter(function (s) { return s.type === 'frame' && t >= s.vstart && t < s.vend; })[0];
    layer.innerHTML = '';
    if (!sc) return;
    var mount = document.getElementById('fw-' + R.scenes.indexOf(sc)), stage = document.getElementById('stage');
    if (!mount || !stage) return;
    stage.appendChild(layer);
    var sr = stage.getBoundingClientRect(), k = sr.width / 1920, found = [];
    var box = function (el) { var r = el.getBoundingClientRect(); return { x: (r.left - sr.left) / k, y: (r.top - sr.top) / k, w: r.width / k, h: r.height / k }; };
    var items = texts(mount).map(function (el) { return { el: el, b: box(el), o: opacity(el), text: el.textContent.trim() }; })
      .filter(function (it) { return it.o > 0.05 && it.b.w > 1 && it.b.h > 1; });
    var name = function (it) { return '"' + it.text.slice(0, 24) + '"'; };
    var captions = sc.captions !== false && (sc.lines || []).length > 0;
    // Words the voice says in this scene, with when it first says each.
    var said = {};
    (sc.lines || []).forEach(function (l) { (l.words || []).forEach(function (w) { var n = norm(w.w); if (said[n] === undefined) said[n] = w.start; }); });
    items.forEach(function (it, i) {
      var b = it.b;
      if (b.x < -2 || b.y < -2 || b.x + b.w > 1922 || b.y + b.h > 1082) found.push([it, name(it) + ' runs off the frame']);
      else if (captions && b.y + b.h > CAP_Y) found.push([it, name(it) + ' is below the caption line']);
      var cs = getComputedStyle(it.el);
      if (/hidden|clip/.test(cs.overflowX + ' ' + cs.overflowY) && (it.el.scrollWidth > it.el.clientWidth + 1 || it.el.scrollHeight > it.el.clientHeight + 1)) found.push([it, name(it) + ' is clipped']);
      for (var j = i + 1; j < items.length; j++) {
        var c = items[j].b, ix = Math.min(b.x + b.w, c.x + c.w) - Math.max(b.x, c.x), iy = Math.min(b.y + b.h, c.y + c.h) - Math.max(b.y, c.y);
        if (ix > 0 && iy > 0 && ix * iy > 0.15 * Math.min(b.w * b.h, c.w * c.h) && !it.el.contains(items[j].el) && !items[j].el.contains(it.el))
          found.push([it, name(it) + ' overlaps ' + name(items[j])]);
      }
      // A label whose words the voice says later, and has not said yet, is early.
      var words = it.text.split(/\s+/).map(norm).filter(function (w) { return w.length > 3 && !STOP.test(w); });
      if (words.length && words.length <= 4 && words.every(function (w) { return said[w] !== undefined && said[w] > t; }))
        found.push([it, name(it) + ' shows before the voice says it']);
    });
    found.forEach(function (f) {
      var b = f[0].b, m = document.createElement('div');
      m.style.cssText = 'position:absolute;outline:3px solid #ff2d55;outline-offset:2px;left:' + b.x + 'px;top:' + b.y + 'px;width:' + b.w + 'px;height:' + b.h + 'px';
      layer.appendChild(m);
    });
    if (found.length) {
      var p = document.createElement('div');
      p.style.cssText = 'position:absolute;left:16px;top:16px;max-width:900px;padding:10px 14px;background:rgba(20,0,6,.86);color:#fff;font:600 20px/1.35 monospace;border-left:6px solid #ff2d55';
      p.textContent = 'lint ' + t.toFixed(2) + 's: ' + found.slice(0, 6).map(function (f) { return f[1]; }).join('; ') + (found.length > 6 ? '; +' + (found.length - 6) + ' more' : '');
      layer.appendChild(p);
      console.warn('reel lint ' + p.textContent);
    }
  }

  // Ride the stage timeline: a property setter runs on every seek, and the microtask waits for every other
  // timeline to land at the same time before measuring.
  var tl = window.__timelines && window.__timelines.reel;
  if (!tl) return;
  var now = NaN, p = {};
  Object.defineProperty(p, 't', { get: function () { return now; }, set: function (v) { if (v === now) return; now = v; queueMicrotask(function () { lint(now); }); } });
  tl.fromTo(p, { t: 0 }, { t: tl.duration(), duration: tl.duration(), ease: 'none' }, 0);
})();
