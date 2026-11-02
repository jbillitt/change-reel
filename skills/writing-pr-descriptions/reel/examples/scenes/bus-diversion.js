// Custom scene: a street map seen from above. Buses are requests, depots are services, the
// yellow diversion sign follows the flag (a toggle in the corner, never a character).
// Labels come from sc.labels; one beat per spoken line.
window.REEL_SCENES = window.REEL_SCENES || {};
window.REEL_SCENES['bus-diversion'] = function (c) {
  var tl = c.tl, sc = c.sc, lb = sc.labels || {}, NS = 'http://www.w3.org/2000/svg', IO = c.IO, S3 = c.S3;
  function S(tag, a, p) { var e = document.createElementNS(NS, tag); for (var k in a) e.setAttribute(k, a[k]); (p || svg).appendChild(e); return e; }
  function T(x, y, t, a, p) { var e = S('text', Object.assign({ x: x, y: y, 'font-family': 'JetBrains Mono, monospace', 'font-weight': 700, 'text-anchor': 'middle' }, a || {}), p); e.textContent = t; return e; }
  var svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('width', 1136); svg.setAttribute('height', 506); svg.setAttribute('viewBox', '0 0 1136 506'); c.frame.appendChild(svg);
  var defs = S('defs', {}), uid = 0;
  function grad(stops, x2, y2) { var i = 'bd' + (++uid), g = S('linearGradient', { id: i, x1: 0, y1: 0, x2: x2 || 0, y2: y2 == null ? 1 : y2 }, defs);
    stops.forEach(function (s) { S('stop', { offset: s[0], 'stop-color': s[1] }, g); }); return 'url(#' + i + ')'; }
  var sh = 'bdsh'; var f = S('filter', { id: sh, x: '-30%', y: '-30%', width: '160%', height: '160%' }, defs);
  S('feDropShadow', { dx: 3, dy: 5, stdDeviation: 4, 'flood-color': '#11161c', 'flood-opacity': .35 }, f);

  // ground, blocks and parks
  S('rect', { x: 0, y: 0, width: 1136, height: 506, fill: '#d9d4c7' });
  for (var gx = 0; gx < 1136; gx += 18) for (var gy = 0; gy < 506; gy += 18) if ((gx * 7 + gy * 3) % 5 === 0) S('circle', { cx: gx + 4, cy: gy + 6, r: 1.2, fill: '#c6bfae' });
  function block(x, y, w, h, roof) {
    var g = S('g', { filter: 'url(#' + sh + ')' });
    S('rect', { x: x, y: y, width: w, height: h, rx: 4, fill: roof || '#b9b2a3' }, g);
    S('rect', { x: x + 6, y: y + 6, width: w - 12, height: h - 12, rx: 3, fill: 'none', stroke: '#ffffff', 'stroke-opacity': .25, 'stroke-width': 2 }, g);
    for (var k = 0; k < Math.floor(w / 46); k++) S('rect', { x: x + 14 + k * 46, y: y + 14, width: 20, height: 14, rx: 2, fill: '#8f887a' }, g);
  }
  function tree(x, y, r) { S('circle', { cx: x + 3, cy: y + 4, r: r, fill: '#55734a', opacity: .6 }); S('circle', { cx: x, cy: y, r: r, fill: '#7da26a' }); S('circle', { cx: x - r * .3, cy: y - r * .3, r: r * .45, fill: '#9cc287' }); }
  S('rect', { x: 0, y: 0, width: 440, height: 130, fill: '#a9c993' });
  [[40, 40, 18], [96, 70, 22], [170, 36, 16], [240, 76, 20], [320, 40, 18], [390, 84, 16]].forEach(function (t) { tree(t[0], t[1], t[2]); });
  block(560, 20, 170, 110, '#c9b79c'); block(750, 20, 160, 110, '#bfb6a6');
  block(30, 220, 170, 130, '#c2b8a7'); block(230, 220, 200, 130, '#cdbfa6');
  block(560, 220, 360, 120, '#c4baa9');
  S('rect', { x: 0, y: 440, width: 900, height: 66, fill: '#a9c993' });
  [[60, 470, 16], [180, 462, 20], [300, 476, 14], [430, 466, 18], [560, 474, 16], [700, 464, 20], [840, 474, 16]].forEach(function (t) { tree(t[0], t[1], t[2]); });

  // roads: the main road to the old depot, the junction and the diversion road to the new one
  var ROADW = 52;
  function road(d) { S('path', { d: d, fill: 'none', stroke: '#eae6dc', 'stroke-width': ROADW + 10, 'stroke-linejoin': 'round' }); }
  function tarmac(d) { S('path', { d: d, fill: 'none', stroke: '#4a4f56', 'stroke-width': ROADW, 'stroke-linejoin': 'round' }); S('path', { d: d, fill: 'none', stroke: '#f5f1e6', 'stroke-width': 3, 'stroke-dasharray': '18 16', opacity: .8 }); }
  var MAIN = 'M0 170 H960', DIV = 'M480 170 V390 H960';
  road(MAIN); road(DIV); tarmac(MAIN); tarmac(DIV);
  S('rect', { x: 454, y: 144, width: 52, height: 52, fill: '#4a4f56' });
  for (var z = 0; z < 5; z++) S('rect', { x: 516 + z * 9, y: 146, width: 5, height: 48, fill: '#f5f1e6', opacity: .85 });

  // depots
  function depot(x, y, name, roof, accent) {
    var g = S('g', { filter: 'url(#' + sh + ')' });
    S('rect', { x: x, y: y, width: 170, height: 120, rx: 6, fill: roof }, g);
    for (var k = 0; k < 6; k++) S('rect', { x: x + 8 + k * 27, y: y + 8, width: 20, height: 104, rx: 2, fill: '#ffffff', opacity: .08 }, g);
    S('rect', { x: x - 6, y: y + 40, width: 18, height: 40, rx: 3, fill: '#2d3238' }, g);
    S('rect', { x: x + 22, y: y + 84, width: 128, height: 26, rx: 5, fill: accent }, g);
    T(x + 86, y + 102, name, { 'font-size': 15, fill: '#ffffff' }, g);
    return g;
  }
  depot(962, 110, lb.old || 'BFF', '#6b7079', c.roleColour('removed'));
  depot(962, 330, lb.new || 'rust-resizer', '#5d6f86', c.roleColour('added'));

  // the saga's bus stop at the start of the route
  var stop = S('g', { transform: 'translate(64 118)' });
  S('rect', { x: -40, y: -14, width: 80, height: 22, rx: 4, fill: '#2d3238', filter: 'url(#' + sh + ')' }, stop);
  S('rect', { x: -40, y: -14, width: 80, height: 6, rx: 3, fill: '#8fd0ff', opacity: .6 }, stop);
  T(0, 26, lb.stop || 'saga', { 'font-size': 14, fill: '#2b2118' }, stop);

  // the diversion sign by the junction: yellow, black arrow, on a post
  var sign = S('g', { transform: 'translate(600 256)' }), signFace = S('g', {}, sign);
  S('rect', { x: -4, y: 0, width: 8, height: 56, fill: '#5d6268' }, signFace);
  S('rect', { x: -78, y: -54, width: 156, height: 66, rx: 6, fill: '#ffd400', stroke: '#1d1d1b', 'stroke-width': 4, filter: 'url(#' + sh + ')' }, signFace);
  T(8, -28, 'DIVERSION', { 'font-family': 'Arial Black, Arial, sans-serif', 'font-size': 18, fill: '#1d1d1b' }, signFace);
  T(8, -8, lb.sign || 'resizes', { 'font-size': 13, fill: '#1d1d1b' }, signFace);
  S('path', { d: 'M-64 -40 v22 m-7 -8 l7 9 l7 -9', fill: 'none', stroke: '#1d1d1b', 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, signFace);
  tl.set(signFace, { scaleY: 0, svgOrigin: '0 56' }, sc.start);

  // the flag: a toggle on a control panel in the corner
  var panel = S('g', { transform: 'translate(930 448)' });
  S('rect', { x: 0, y: 0, width: 190, height: 50, rx: 10, fill: '#2d3238', filter: 'url(#' + sh + ')' }, panel);
  T(58, 31, lb.flag || 'resize flag', { 'font-size': 14, fill: '#e9edf2' }, panel);
  var track = S('rect', { x: 120, y: 13, width: 54, height: 24, rx: 12, fill: '#6b7079' }, panel);
  var knob = S('circle', { cx: 132, cy: 25, r: 9, fill: '#ffffff' }, panel);
  function flag(on, t) { tl.to(knob, { attr: { cx: on ? 162 : 132 }, duration: .3, ease: S3 }, t).to(track, { attr: { fill: on ? c.roleColour('added') : '#6b7079' }, duration: .3 }, t); }

  // buses, seen from above; each follows a path and turns with it
  function bus(label, colour) {
    var outer = S('g', { opacity: 0 }), g = S('g', { filter: 'url(#' + sh + ')' }, outer);
    S('rect', { x: -46, y: -17, width: 92, height: 34, rx: 7, fill: colour }, g);
    S('rect', { x: -40, y: -11, width: 80, height: 22, rx: 4, fill: '#ffffff', opacity: .16 }, g);
    S('rect', { x: 34, y: -15, width: 10, height: 30, rx: 3, fill: '#1f2a36', opacity: .8 }, g);
    S('rect', { x: -14, y: -7, width: 22, height: 14, rx: 2, fill: '#ffffff', opacity: .25 }, g);
    T(-4, 5, label, { 'font-size': 13, fill: '#ffffff' }, g);
    return outer;
  }
  function drive(b, d, t, dur) {
    var p = S('path', { d: d, fill: 'none', stroke: 'none' }), len = p.getTotalLength(), o = { v: 0 };
    tl.set(b, { opacity: 1 }, t).fromTo(o, { v: 0 }, { v: 1, duration: dur, ease: IO, onUpdate: function () {
      var q = p.getPointAtLength(len * o.v), q2 = p.getPointAtLength(Math.min(len, len * o.v + 2)), a = Math.atan2(q2.y - q.y, q2.x - q.x) * 180 / Math.PI;
      if (o.v > .995) a = 0;
      b.setAttribute('transform', 'translate(' + q.x + ' ' + q.y + ') rotate(' + a + ')'); } }, t);
  }
  function tag(x, y, text, colour, t) {
    var g = S('g', { transform: 'translate(' + x + ' ' + y + ')', opacity: 0 }), w = text.length * 9 + 28;
    S('path', { d: 'M' + (-w / 2) + ' -16 h' + w + ' v32 h-' + w + ' z', fill: '#fffdf6', stroke: colour, 'stroke-width': 3, filter: 'url(#' + sh + ')' }, g);
    S('circle', { cx: -w / 2 + 10, cy: 0, r: 4, fill: colour }, g);
    T(6, 5, text, { 'font-size': 14, fill: '#2b2118' }, g);
    tl.fromTo(g, { opacity: 0, y: y + 10 }, { opacity: 1, y: y, duration: .4, ease: S3 }, t);
    return g;
  }

  var L = sc.lines || [], at = function (i, f) { var l = L[Math.min(i, L.length - 1)] || { start: sc.start, len: 4 }; return l.start + l.len * f; };
  var resizeBus = bus(lb.bus || 'resize', c.roleColour('changed')), delBus = bus(lb.bus2 || 'crop', '#7a7f87'), resizeBack = bus(lb.bus || 'resize', c.roleColour('changed'));
  var RESIZE_ROUTE = 'M70 170 H440 Q480 170 480 210 V350 Q480 390 520 390 H900';
  // 1: flag on, sign up, the resize bus takes the diversion
  flag(true, at(0, .15));
  tl.to(signFace, { scaleY: 1, duration: .5, ease: 'back.out(1.4)', svgOrigin: '0 56' }, at(0, .25));
  drive(resizeBus, RESIZE_ROUTE, at(0, .35), Math.max(1.6, L[0] ? L[0].len * .6 : 2));
  // 2: what the resize bus carries, and crops still take the main road
  tag(820, 446, lb.carries || 'id, width, height', c.roleColour('added'), at(1, .1));
  drive(delBus, 'M70 170 H900', at(1, .45), 1.8);
  // 3: an empty reply comes back; the saga fills in id and status
  var env = S('g', { opacity: 0 });
  S('rect', { x: -22, y: -15, width: 44, height: 30, rx: 3, fill: '#fffdf6', stroke: '#2b2118', 'stroke-width': 2 }, env);
  S('path', { d: 'M-22 -15 L0 3 L22 -15', fill: 'none', stroke: '#2b2118', 'stroke-width': 2 }, env);
  drive(env, 'M900 390 H520 Q480 390 480 350 V210 Q480 170 440 170 H110', at(2, .05), Math.max(1.5, L[2] ? L[2].len * .5 : 2));
  tag(780, 300, lb.reply || '200, empty body', '#6b7079', at(2, .05));
  tag(150, 70, lb.fills || '+ id, status', c.roleColour('added'), at(2, .65));
  tl.to(env, { opacity: 0, duration: .3 }, at(2, .9)).to(delBus, { opacity: 0, duration: .3 }, at(2, .5));
  // 4: flag off, sign folds, the next resize takes the main road again
  flag(false, at(3, .1));
  tl.to(signFace, { scaleY: 0, duration: .4, ease: 'power2.in', svgOrigin: '0 56' }, at(3, .2));
  tl.to(resizeBus, { opacity: 0, duration: .3 }, at(3, .1));
  drive(resizeBack, 'M70 170 H900', at(3, .35), 1.8);
};
