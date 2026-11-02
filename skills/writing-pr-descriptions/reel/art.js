// Illustration kit for the reel stage: richer, hand-built SVG art for the everyday devices.
// Loaded before the core; registers window.ART with drawing functions that return parts to animate.
(function () {
  function S(tag, a, p) { var e = document.createElementNS('http://www.w3.org/2000/svg', tag); for (var k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; }
  function T(x, y, t, a, p) { var e = S('text', Object.assign({ x: x, y: y }, a || {}), p); e.textContent = t; return e; }
  var uid = 0; function id(p) { uid += 1; return (p || 'a') + uid; }
  function lin(defs, stops, x2, y2) {
    var i = id('lg'), g = S('linearGradient', { id: i, x1: 0, y1: 0, x2: x2 == null ? 0 : x2, y2: y2 == null ? 1 : y2 }, defs);
    stops.forEach(function (s, k) { S('stop', { offset: s[0], 'stop-color': s[1], 'stop-opacity': s[2] == null ? 1 : s[2] }, g); });
    return 'url(#' + i + ')';
  }
  function rad(defs, stops) {
    var i = id('rg'), g = S('radialGradient', { id: i, cx: '50%', cy: '40%', r: '65%' }, defs);
    stops.forEach(function (s) { S('stop', { offset: s[0], 'stop-color': s[1], 'stop-opacity': s[2] == null ? 1 : s[2] }, g); });
    return 'url(#' + i + ')';
  }
  function softShadow(defs) {
    var i = id('sh'), f = S('filter', { id: i, x: '-20%', y: '-20%', width: '140%', height: '160%' }, defs);
    S('feDropShadow', { dx: 0, dy: 6, stdDeviation: 6, 'flood-color': '#1b120a', 'flood-opacity': .28 }, f);
    return 'url(#' + i + ')';
  }

  // A paper takeaway cup with lid and sleeve; the sleeve carries a label.
  function cup(p, defs, label, colour, scale) {
    var g = S('g', { transform: 'scale(' + (scale || 1) + ')' }, p);
    S('path', { d: 'M-22 -30 L22 -30 L17 30 L-17 30 Z', fill: lin(defs, [[0, '#ffffff'], [1, '#e7e1d6']], 1, 0) }, g);
    S('rect', { x: -25, y: -40, width: 50, height: 10, rx: 4, fill: '#3d2b20' }, g);
    S('rect', { x: -14, y: -46, width: 28, height: 7, rx: 3, fill: '#2a1d15' }, g);
    S('path', { d: 'M-20.5 -12 L20.5 -12 L18.6 12 L-18.6 12 Z', fill: colour || '#b88a5a' }, g);
    if (label) T(0, 4, label, { 'text-anchor': 'middle', 'font-family': 'JetBrains Mono, monospace', 'font-size': 9, 'font-weight': 600, fill: '#fff' }, g);
    S('path', { d: 'M-15 -26 L-11 26', stroke: '#fff', 'stroke-width': 3, opacity: .6 }, g);
    return g;
  }

  // The coffee stand: awning, chalk menu, shelves, espresso machine, barista, two pickup stations.
  function coffeeStand(svg, o) {
    var defs = S('defs', {}, svg), sh = softShadow(defs);
    // Back wall: warm tiles with a little grout pattern.
    S('rect', { x: 0, y: 0, width: 1136, height: 506, fill: lin(defs, [[0, '#f4ead9'], [1, '#e6d5bb']]) }, svg);
    for (var y = 120; y < 330; y += 26) for (var x = (y / 26) % 2 ? 0 : 26; x < 1136; x += 52)
      S('rect', { x: x + 2, y: y + 2, width: 48, height: 22, rx: 3, fill: '#efe2cc', stroke: '#e1cfb2', 'stroke-width': 1 }, svg);
    // Striped awning with a scalloped edge.
    var aw = S('g', {}, svg), stripes = [o.awningA || '#2f6f5e', '#f6efe3'];
    for (var i = 0; i < 24; i++) S('rect', { x: i * 48, y: 0, width: 48, height: 74, fill: stripes[i % 2] }, aw);
    for (var j = 0; j < 24; j++) S('path', { d: 'M' + (j * 48) + ' 74 q24 30 48 0 Z', fill: stripes[j % 2] }, aw);
    S('rect', { x: 0, y: 0, width: 1136, height: 10, fill: 'rgba(0,0,0,.15)' }, aw);
    // Chalk menu board.
    var mb = S('g', { filter: sh }, svg);
    S('rect', { x: 70, y: 120, width: 300, height: 170, rx: 8, fill: '#6b4a2b' }, mb);
    S('rect', { x: 80, y: 130, width: 280, height: 150, rx: 4, fill: '#24302a' }, mb);
    T(220, 166, 'MENU', { 'text-anchor': 'middle', 'font-family': 'Caveat, cursive', 'font-size': 34, fill: '#f2f0e4' }, mb);
    (o.menu || []).forEach(function (m, k) { T(104, 204 + k * 30, m, { 'font-family': 'Caveat, cursive', 'font-size': 26, fill: '#e8e4d2' }, mb); });
    // Shelf with cups.
    S('rect', { x: 430, y: 210, width: 240, height: 10, fill: '#7a5532' }, svg);
    [455, 495, 535, 575, 615, 650].forEach(function (cx, k) { var c = cup(svg, defs, null, ['#c9a46b', '#8fb8a8', '#d98c7a'][k % 3], .7); c.setAttribute('transform', 'translate(' + cx + ' 186) scale(.7)'); });
    // Espresso machine with steam.
    var em = S('g', { transform: 'translate(440 300)', filter: sh }, svg);
    S('rect', { x: -70, y: -60, width: 140, height: 80, rx: 10, fill: lin(defs, [[0, '#e9eef2'], [.5, '#a9b4bd'], [1, '#6f7c86']], 1, 0) }, em);
    S('rect', { x: -60, y: -48, width: 120, height: 14, rx: 4, fill: '#2b3238' }, em);
    S('circle', { cx: -34, cy: -12, r: 9, fill: '#ffd166' }, em); S('circle', { cx: 34, cy: -12, r: 9, fill: '#ef476f' }, em);
    var steam = [];
    for (var s2 = 0; s2 < 3; s2++) steam.push(S('path', { d: 'M' + (-20 + s2 * 20) + ' -64 q10 -18 0 -36 q-10 -18 0 -36', fill: 'none', stroke: '#fff', 'stroke-width': 5, 'stroke-linecap': 'round', opacity: .7 }, em));
    // Counter: plank front, polished top.
    S('rect', { x: 0, y: 330, width: 1136, height: 28, fill: lin(defs, [[0, '#c69a6b'], [1, '#9b6f45']]) }, svg);
    S('rect', { x: 0, y: 358, width: 1136, height: 148, fill: '#7a5532' }, svg);
    for (var px = 0; px < 1136; px += 70) S('line', { x1: px, y1: 358, x2: px, y2: 506, stroke: '#64452a', 'stroke-width': 3 }, svg);
    // Barista: apron, arms, friendly face, name badge.
    var b = S('g', { transform: 'translate(630 330)' }, svg);
    S('path', { d: 'M-46 0 C-46 -70 -30 -98 0 -98 C30 -98 46 -70 46 0 Z', fill: '#3a4a5a' }, b);
    S('path', { d: 'M-30 0 V-70 Q0 -80 30 -70 V0 Z', fill: '#2f6f5e' }, b);
    S('circle', { cx: 0, cy: -122, r: 30, fill: '#f0c3a1' }, b);
    S('path', { d: 'M-31 -128 Q-28 -160 0 -160 Q30 -160 31 -128 Q14 -142 0 -140 Q-16 -142 -31 -128 Z', fill: '#4b2e1f' }, b);
    var eyes = S('g', {}, b); [-10, 10].forEach(function (ex) { S('circle', { cx: ex, cy: -124, r: 3.5, fill: '#2b1a10' }, eyes); });
    S('path', { d: 'M-9 -108 Q0 -101 9 -108', fill: 'none', stroke: '#8a3b2a', 'stroke-width': 3, 'stroke-linecap': 'round' }, b);
    S('rect', { x: -36, y: -52, width: 72, height: 18, rx: 4, fill: '#fff' }, b);
    T(0, -39, o.barista || 'barista', { 'text-anchor': 'middle', 'font-family': 'JetBrains Mono, monospace', 'font-size': 11, 'font-weight': 600, fill: '#2b1a10' }, b);
    var arm = S('path', { d: 'M40 -70 Q78 -60 88 -32', fill: 'none', stroke: '#3a4a5a', 'stroke-width': 16, 'stroke-linecap': 'round' }, b);
    // Two pickup stations with hanging signs and bells.
    function station(x, label, active) {
      var g = S('g', { transform: 'translate(' + x + ' 0)' }, svg);
      S('line', { x1: -60, y1: 74, x2: -60, y2: 118, stroke: '#4b3524', 'stroke-width': 3 }, g);
      S('line', { x1: 60, y1: 74, x2: 60, y2: 118, stroke: '#4b3524', 'stroke-width': 3 }, g);
      var sign = S('rect', { x: -86, y: 118, width: 172, height: 52, rx: 10, fill: active ? '#1f7a4a' : '#9aa1a8', filter: sh }, g);
      T(0, 152, label, { 'text-anchor': 'middle', 'font-family': 'JetBrains Mono, monospace', 'font-size': 16, 'font-weight': 700, fill: '#fff' }, g);
      S('rect', { x: -90, y: 300, width: 180, height: 30, rx: 6, fill: active ? '#d9efe2' : '#e3e3e0' }, g);
      S('path', { d: 'M40 300 q0 -22 18 -22 q18 0 18 22 Z', fill: '#d4a53c' }, g); S('circle', { cx: 58, cy: 276, r: 4, fill: '#d4a53c' }, g);
      return { g: g, sign: sign, x: x };
    }
    var A = station(850, o.a || 'old station', false), B = station(1040, o.b || 'new station', true);
    return { steam: steam, arm: arm, eyes: eyes, stations: { a: A, b: B }, defs: defs, hand: { x: 718, y: 298 } };
  }

  // A big takeaway cup in cross-section that fills in labelled layers.
  function bigCup(svg, o) {
    var defs = S('defs', {}, svg), sh = softShadow(defs);
    S('rect', { x: 0, y: 0, width: 1136, height: 506, fill: rad(defs, [[0, '#fbf3e6'], [1, '#ead9bf']]) }, svg);
    S('ellipse', { cx: 568, cy: 470, rx: 240, ry: 22, fill: 'rgba(60,40,20,.18)' }, svg);
    var g = S('g', { filter: sh }, svg);
    S('path', { d: 'M418 110 L718 110 L690 460 L446 460 Z', fill: lin(defs, [[0, '#ffffff'], [.6, '#f3eee6'], [1, '#e0d8ca']], 1, 0) }, g);
    var clipId = id('cc'), cp = S('clipPath', { id: clipId }, defs);
    S('path', { d: 'M424 116 L712 116 L685 454 L451 454 Z' }, cp);
    var liquid = S('g', { 'clip-path': 'url(#' + clipId + ')' }, g);
    S('rect', { x: 400, y: 86, width: 340, height: 26, rx: 8, fill: '#3d2b20' }, g);
    S('rect', { x: 500, y: 70, width: 136, height: 18, rx: 6, fill: '#2a1d15' }, g);
    var sleeve = S('g', {}, g);
    S('path', { d: 'M436 250 L700 250 L692 340 L444 340 Z', fill: '#b88a5a', opacity: .9 }, sleeve);
    T(568, 304, o.empty || 'empty', { 'text-anchor': 'middle', 'font-family': 'JetBrains Mono, monospace', 'font-size': 26, 'font-weight': 700, fill: '#fff' }, sleeve);
    var layers = (o.fields || []).map(function (fl, k) {
      var top = 454 - (k + 1) * 92, lay = S('g', { opacity: 0 }, liquid);
      S('rect', { x: 400, y: top, width: 340, height: 92, fill: ['#6f4a2f', '#a8744c', '#d9b38c'][k % 3] }, lay);
      S('path', { d: 'M400 ' + top + ' q42 -10 84 0 t84 0 t84 0 t84 0 V' + (top + 10) + ' H400 Z', fill: 'rgba(255,255,255,.25)' }, lay);
      T(568, top + 54, fl, { 'text-anchor': 'middle', 'font-family': 'JetBrains Mono, monospace', 'font-size': 22, 'font-weight': 700, fill: '#fff' }, lay);
      return lay;
    });
    var steam = [];
    for (var s2 = 0; s2 < 3; s2++) steam.push(S('path', { d: 'M' + (530 + s2 * 38) + ' 60 q14 -22 0 -44 q-14 -22 0 -44', fill: 'none', stroke: '#c9b8a4', 'stroke-width': 6, 'stroke-linecap': 'round', opacity: 0 }, svg));
    return { layers: layers, steam: steam, sleeve: sleeve };
  }

  // A storybook landscape in ink and watercolour; elements are revealed line by line.
  function storyLandscape(svg, o) {
    var defs = S('defs', {}, svg), wash = id('wash'), f = S('filter', { id: wash, x: '-10%', y: '-10%', width: '120%', height: '120%' }, defs);
    S('feTurbulence', { type: 'fractalNoise', baseFrequency: '0.035', numOctaves: 3, seed: 5, result: 'n' }, f);
    S('feDisplacementMap', { in: 'SourceGraphic', in2: 'n', scale: 9, result: 'd' }, f);
    S('feGaussianBlur', { in: 'd', stdDeviation: 1.2 }, f);
    var W = function (d, fill, op) { return S('path', { d: d, fill: fill, opacity: op == null ? .85 : op, filter: 'url(#' + wash + ')' }, svg); };
    var ink = function (d, w) { return S('path', { d: d, fill: 'none', stroke: '#3b2a1e', 'stroke-width': w || 2.2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg); };
    var parts = {};
    parts.sky = W('M0 0 H480 V230 H0 Z', '#cfe3ea', .7);
    var hills = S('g', {}, svg);
    hills.appendChild(W('M0 230 Q120 160 240 210 T480 190 V480 H0 Z', '#a8c49a'));
    hills.appendChild(W('M0 290 Q160 240 300 280 T480 260 V480 H0 Z', '#8fb07f'));
    parts.hills = hills;
    var road = S('g', {}, svg);
    road.appendChild(W('M60 480 Q140 380 230 330 Q300 300 330 250', '#e6d3a8', .95)); road.lastChild.setAttribute('stroke', '#e6d3a8'); road.lastChild.setAttribute('stroke-width', 26); road.lastChild.setAttribute('fill', 'none');
    road.appendChild(ink('M48 480 Q130 378 222 326 Q290 296 318 248', 1.6));
    parts.road = road;
    var fork = S('g', {}, svg);
    var nr = W('M230 330 Q330 330 420 300', '#e6d3a8', .95); nr.setAttribute('stroke', '#e6d3a8'); nr.setAttribute('stroke-width', 22); nr.setAttribute('fill', 'none'); fork.appendChild(nr);
    fork.appendChild(ink('M232 342 Q332 342 424 312', 1.6));
    parts.fork = fork;
    var post = S('g', {}, svg);
    post.appendChild(ink('M232 330 V250', 3));
    var fl = S('path', { d: 'M232 252 L282 266 L232 282 Z', fill: '#c0392b', filter: 'url(#' + wash + ')' }, post);
    parts.flag = post; parts.flagCloth = fl;
    var castle = S('g', {}, svg);
    castle.appendChild(W('M330 250 V180 H350 V195 H365 V180 H385 V195 H400 V180 H420 V250 Z', '#c9bfae', .95));
    castle.appendChild(ink('M330 250 V180 H350 V195 H365 V180 H385 V195 H400 V180 H420 V250 Z', 1.8));
    castle.appendChild(W('M370 250 V222 Q375 212 380 222 V250 Z', '#6b4f36', .9));
    parts.castle = castle;
    var msg = S('g', { transform: 'translate(410 292)' }, svg);
    msg.appendChild(W('M-10 0 Q0 -36 10 0 Z', '#4b6aa8', .9)); msg.appendChild(S('circle', { cx: 0, cy: -42, r: 8, fill: '#f0c3a1' }));
    msg.appendChild(S('rect', { x: 10, y: -30, width: 22, height: 15, fill: '#fbf7ee', stroke: '#3b2a1e', 'stroke-width': 1.4 }));
    parts.messenger = msg;
    var sun = W('M440 40 a26 26 0 1 0 1 0 Z', '#f2c46d', .9); parts.sun = sun;
    return parts;
  }

  // Theatre dressing: a gilded proscenium, footlights, spotlight beams and a painted backdrop.
  function theatre(frame, svgNS) {
    var s = S('svg', { width: 1136, height: 506, viewBox: '0 0 1136 506', style: 'position:absolute;inset:0;pointer-events:none' });
    var defs = S('defs', {}, s);
    var back = S('svg', { width: 1136, height: 506, viewBox: '0 0 1136 506', style: 'position:absolute;inset:0' });
    var bdefs = S('defs', {}, back);
    S('rect', { width: 1136, height: 506, fill: lin(bdefs, [[0, '#2d3e66'], [.6, '#7a6a8f'], [1, '#c99a7a']]) }, back);
    S('path', { d: 'M0 360 Q200 280 420 330 T860 300 T1136 320 V506 H0 Z', fill: '#4a5a4a', opacity: .8 }, back);
    S('path', { d: 'M0 390 Q260 330 520 370 T1136 350 V506 H0 Z', fill: '#3a4a3c' }, back);
    for (var k = 0; k < 18; k++) S('circle', { cx: 60 + k * 61, cy: 60 + (k * 37) % 120, r: 1.6, fill: '#fff', opacity: .7 }, back);
    var gold = lin(defs, [[0, '#f6e3a1'], [.5, '#c9973a'], [1, '#7a5a1c']], 1, 0);
    S('path', { d: 'M0 0 H1136 V506 H1086 V96 Q568 10 50 96 V506 H0 Z', fill: gold, opacity: .95 }, s);
    S('path', { d: 'M50 96 Q568 10 1086 96', fill: 'none', stroke: '#fff3c4', 'stroke-width': 2, opacity: .6 }, s);
    var foot = [];
    for (var i = 0; i < 14; i++) {
      var x = 110 + i * 70;
      S('ellipse', { cx: x, cy: 494, rx: 30, ry: 8, fill: '#fff3c4', opacity: .35 }, s);
      foot.push(S('circle', { cx: x, cy: 492, r: 6, fill: '#ffe9a8' }, s));
    }
    var beams = [];
    [300, 836].forEach(function (x) {
      beams.push(S('path', { d: 'M' + x + ' 40 L' + (x - 150) + ' 420 L' + (x + 150) + ' 420 Z', fill: lin(defs, [[0, '#fff6d6', .55], [1, '#fff6d6', 0]]), opacity: .5 }, s));
    });
    frame.insertBefore(back, frame.firstChild);
    frame.appendChild(s);
    return { beams: beams, foot: foot, overlay: s };
  }


  // A hob with flames, a glossy cast-iron pan, a wooden spoon; ingredients arrive as labelled jars.
  function pan(svg, o) {
    var defs = S('defs', {}, svg), sh = softShadow(defs);
    S('rect', { x: 0, y: 0, width: 1136, height: 506, fill: lin(defs, [[0, '#f3efe7'], [1, '#e2dacb']]) }, svg);
    for (var x = 0; x < 1136; x += 64) S('line', { x1: x, y1: 0, x2: x, y2: 300, stroke: '#e6dfd2', 'stroke-width': 2 }, svg);
    S('rect', { x: 0, y: 300, width: 1136, height: 206, fill: lin(defs, [[0, '#4a4f55'], [1, '#2c3035']]) }, svg);
    S('rect', { x: 0, y: 300, width: 1136, height: 8, fill: '#6b7178' }, svg);
    var flames = [];
    for (var k = 0; k < 9; k++) {
      var fx = 380 + k * 34;
      flames.push(S('path', { d: 'M' + fx + ' 378 q-10 -18 0 -36 q10 18 0 36 Z', fill: k % 2 ? '#4f8ff0' : '#7fb3ff', opacity: .9 }, svg));
    }
    S('ellipse', { cx: 528, cy: 380, rx: 190, ry: 12, fill: '#1c1f22' }, svg);
    var p = S('g', { filter: sh }, svg);
    S('path', { d: 'M330 330 Q528 420 726 330 Z', fill: lin(defs, [[0, '#3b3f44'], [1, '#121416']]) }, p);
    S('ellipse', { cx: 528, cy: 330, rx: 198, ry: 30, fill: lin(defs, [[0, '#2a2d31'], [1, '#41464c']]) }, p);
    S('ellipse', { cx: 528, cy: 330, rx: 178, ry: 22, fill: '#1a1c1f' }, p);
    S('path', { d: 'M380 322 Q460 312 540 318', fill: 'none', stroke: '#ffffff', 'stroke-width': 4, opacity: .18, 'stroke-linecap': 'round' }, p);
    S('rect', { x: 720, y: 318, width: 250, height: 22, rx: 11, fill: lin(defs, [[0, '#6b4a2b'], [1, '#3e2a18']]) }, p);
    S('circle', { cx: 952, cy: 329, r: 6, fill: '#c9a46b' }, p);
    var spoon = S('g', { transform: 'translate(250 250) rotate(-28)' }, svg);
    S('rect', { x: -6, y: -140, width: 12, height: 150, rx: 6, fill: '#b5835a' }, spoon);
    S('ellipse', { cx: 0, cy: 20, rx: 22, ry: 30, fill: '#c69565' }, spoon);
    var steam = [];
    for (var s2 = 0; s2 < 4; s2++) steam.push(S('path', { d: 'M' + (440 + s2 * 60) + ' 296 q14 -22 0 -44 q-14 -22 0 -44', fill: 'none', stroke: '#ffffff', 'stroke-width': 6, 'stroke-linecap': 'round', opacity: 0 }, svg));
    var inPan = S('g', {}, svg);
    function jar(label, colour) {
      var outer = S('g', {}, inPan), g = S('g', {}, outer);
      S('rect', { x: -58, y: -26, width: 116, height: 52, rx: 14, fill: colour, filter: sh }, g);
      S('rect', { x: -48, y: -36, width: 96, height: 14, rx: 6, fill: '#e9e3d6' }, g);
      T(0, 8, label, { 'text-anchor': 'middle', 'font-family': 'JetBrains Mono, monospace', 'font-size': 15, 'font-weight': 700, fill: '#fff' }, g);
      return { outer: outer, g: g };
    }
    var plate = S('g', { opacity: 0, transform: 'translate(910 170)' }, svg);
    S('ellipse', { cx: 0, cy: 46, rx: 120, ry: 22, fill: '#ffffff', stroke: '#d7d0c2', 'stroke-width': 3, filter: sh }, plate);
    S('path', { d: 'M-90 40 Q0 -70 90 40 Z', fill: lin(defs, [[0, '#f4f4f4'], [1, '#b9bec4']]) }, plate);
    S('circle', { cx: 0, cy: -22, r: 9, fill: '#9aa1a8' }, plate);
    var plateLabel = T(0, 86, o.served || 'served', { 'text-anchor': 'middle', 'font-family': 'JetBrains Mono, monospace', 'font-size': 16, 'font-weight': 700, fill: '#2b2118' }, plate);
    return { flames: flames, steam: steam, jar: jar, plate: plate, plateLabel: plateLabel, slots: [[440, 286], [616, 286], [528, 248], [440, 210], [616, 210]] };
  }

  // A door with two locks: each lock lights when its condition holds; the door opens only when both do.
  function twoLocks(svg, o) {
    var defs = S('defs', {}, svg), sh = softShadow(defs);
    S('rect', { x: 0, y: 0, width: 1136, height: 506, fill: lin(defs, [[0, '#efe9df'], [1, '#d9cfbf']]) }, svg);
    for (var y = 0; y < 506; y += 40) for (var x = (y / 40) % 2 ? 0 : 60; x < 1136; x += 120)
      S('rect', { x: x + 2, y: y + 2, width: 116, height: 36, fill: '#e6ddd0', stroke: '#d5c9b6' }, svg);
    S('rect', { x: 430, y: 60, width: 276, height: 420, fill: '#2b2118' }, svg);
    var glow = S('rect', { x: 444, y: 74, width: 248, height: 406, fill: '#fff4cf', opacity: 0 }, svg);
    var door = S('g', {}, svg);
    S('rect', { x: 444, y: 74, width: 248, height: 406, fill: lin(defs, [[0, '#8a5a34'], [1, '#5e3b20']], 1, 0), filter: sh }, door);
    [110, 250, 390].forEach(function (yy) { S('rect', { x: 470, y: yy - 50, width: 196, height: 110, rx: 6, fill: 'none', stroke: '#4a2f19', 'stroke-width': 4 }, door); });
    var locks = (o.inputs || ['condition A', 'condition B']).map(function (label, i) {
      var g = S('g', { transform: 'translate(640 ' + (220 + i * 90) + ')' }, door);
      S('rect', { x: -22, y: -26, width: 44, height: 52, rx: 8, fill: lin(defs, [[0, '#e8c46a'], [1, '#9b7424']]) }, g);
      var lamp = S('circle', { cx: 0, cy: -8, r: 8, fill: '#7a1f1f' }, g);
      S('rect', { x: -4, y: 2, width: 8, height: 14, rx: 2, fill: '#3a2a10' }, g);
      T(-250, 6, label, { 'text-anchor': 'end', 'font-family': 'JetBrains Mono, monospace', 'font-size': 18, 'font-weight': 700, fill: '#2b2118' }, g);
      S('line', { x1: -240, y1: 0, x2: -30, y2: 0, stroke: '#2b2118', 'stroke-width': 2, 'stroke-dasharray': '4 6', opacity: .6 }, g);
      return { lamp: lamp };
    });
    T(568, 46, o.output || 'the new route', { 'text-anchor': 'middle', 'font-family': 'JetBrains Mono, monospace', 'font-size': 18, 'font-weight': 700, fill: '#2b2118' }, svg);
    return { door: door, glow: glow, locks: locks };
  }

  // A shop aisle: stocked shelves behind, a wire basket on the floor, a till that prints the receipt.
  // Items are drawn as real products (carton, tin, bottle, bag) and sit between the basket's back and front mesh.
  function basket(svg, o) {
    var defs = S('defs', {}, svg), sh = softShadow(defs), mono = 'JetBrains Mono, monospace';
    S('rect', { x: 0, y: 0, width: 1136, height: 506, fill: lin(defs, [[0, '#f6f1e8'], [1, '#e9e0d0']]) }, svg);
    var shelfCols = ['#d9534f', '#f0ad4e', '#5bc0de', '#5cb85c', '#8e7cc3', '#e8e2d4'];
    [70, 170].forEach(function (sy, r) {
      for (var x = 20; x < 1110; x += 26 + (x % 3) * 4) {
        var h = 46 + ((x * 7 + r * 13) % 30), w = 20 + (x % 3) * 4;
        S('rect', { x: x, y: sy + 70 - h, width: w, height: h, rx: 3, fill: shelfCols[(x / 26 + r * 2) % 6 | 0], opacity: .32 }, svg);
      }
      S('rect', { x: 0, y: sy + 70, width: 1136, height: 10, fill: '#bfb3a0' }, svg);
      S('rect', { x: 0, y: sy + 80, width: 1136, height: 4, fill: '#a3967f', opacity: .6 }, svg);
    });
    S('rect', { x: 0, y: 420, width: 1136, height: 86, fill: lin(defs, [[0, '#d8cdb9'], [1, '#c4b79f']]) }, svg);
    for (var tx = 0; tx < 1136; tx += 96) S('line', { x1: tx, y1: 420, x2: tx - 40, y2: 506, stroke: '#b8ab92', 'stroke-width': 2 }, svg);
    S('ellipse', { cx: 470, cy: 446, rx: 230, ry: 16, fill: '#7a6a52', opacity: .35 }, svg);
    // basket back wall and handles
    var red = lin(defs, [[0, '#e0473b'], [1, '#a92d24']], 1, 0);
    S('path', { d: 'M300 250 Q470 112 640 250', fill: 'none', stroke: '#8f241c', 'stroke-width': 12, 'stroke-linecap': 'round' }, svg);
    S('path', { d: 'M250 252 L690 252 L654 440 L286 440 Z', fill: '#5a1712', opacity: .9 }, svg);
    var items = S('g', {}, svg), front = S('g', {}, svg), tagLayer;
    // front mesh drawn over the items, so they read as inside the basket
    S('path', { d: 'M250 252 L690 252 L654 440 L286 440 Z', fill: 'none', stroke: red, 'stroke-width': 10, 'stroke-linejoin': 'round' }, front);
    for (var i = 1; i < 9; i++) { var fx = 250 + i * 49, bx = 286 + i * 41; S('line', { x1: fx, y1: 258, x2: bx, y2: 436, stroke: '#c8392e', 'stroke-width': 5, opacity: .9 }, front); }
    [300, 345, 390].forEach(function (yy) { var t = (yy - 252) / 188; S('line', { x1: 250 + 36 * t, y1: yy, x2: 690 - 36 * t, y2: yy, stroke: '#c8392e', 'stroke-width': 5 }, front); });
    S('rect', { x: 244, y: 244, width: 452, height: 16, rx: 8, fill: red, filter: sh }, front);
    S('path', { d: 'M310 252 Q470 128 630 252', fill: 'none', stroke: '#e0473b', 'stroke-width': 10, 'stroke-linecap': 'round' }, front);
    S('rect', { x: 440, y: 150, width: 60, height: 18, rx: 9, fill: '#2b2118' }, front);
    // the till, with a paper roll and a receipt that feeds out
    var till = S('g', { transform: 'translate(820 210)', filter: sh }, svg);
    S('rect', { x: 0, y: 120, width: 270, height: 90, rx: 12, fill: lin(defs, [[0, '#4a4f57'], [1, '#2b2f35']]) }, till);
    S('rect', { x: 30, y: 40, width: 210, height: 90, rx: 10, fill: lin(defs, [[0, '#5b616a'], [1, '#3a3f46']]) }, till);
    S('rect', { x: 50, y: 56, width: 170, height: 40, rx: 4, fill: '#9fe0b8' }, till);
    var display = T(135, 84, o.total || '', { 'text-anchor': 'middle', 'font-family': mono, 'font-size': 18, 'font-weight': 700, fill: '#163a24' }, till);
    for (var kx = 0; kx < 4; kx++) for (var ky = 0; ky < 2; ky++) S('rect', { x: 40 + kx * 50, y: 140 + ky * 30, width: 38, height: 20, rx: 4, fill: '#d8dbe0', opacity: .8 }, till);
    S('rect', { x: 180, y: 28, width: 54, height: 14, rx: 4, fill: '#23262b' }, till);
    tagLayer = S('g', {}, svg);
    var receipt = S('g', { opacity: 0 }, svg), paper = S('g', {}, receipt);
    S('path', { d: 'M1002 238 L1002 40 L1092 40 L1092 238', fill: '#fffdf8', stroke: '#d6cfc0', 'stroke-width': 2 }, paper);
    S('path', { d: 'M1002 40 l9 -8 l9 8 l9 -8 l9 8 l9 -8 l9 8 l9 -8 l9 8 l9 -8 l9 8', fill: '#fffdf8', stroke: '#d6cfc0', 'stroke-width': 2 }, paper);
    var receiptLines = [];
    function line(text, k) { var e = T(1047, 70 + k * 22, text, { 'text-anchor': 'middle', 'font-family': mono, 'font-size': 12, 'font-weight': 600, fill: '#2b2118' }, paper); receiptLines.push(e); return e; }
    var shapes = [
      function (g, c) { S('rect', { x: -40, y: -50, width: 80, height: 100, rx: 6, fill: c }, g); S('path', { d: 'M-40 -50 L0 -72 L40 -50 Z', fill: c, opacity: .8 }, g); S('rect', { x: -40, y: -14, width: 80, height: 30, fill: '#fff', opacity: .9 }, g); return 4; },
      function (g, c) { S('rect', { x: -38, y: -40, width: 76, height: 80, rx: 8, fill: lin(defs, [[0, '#c9ced4'], [.5, '#f4f6f8'], [1, '#9aa1a8']], 1, 0) }, g); S('rect', { x: -38, y: -24, width: 76, height: 46, fill: c }, g); return 4; },
      function (g, c) { S('path', { d: 'M-22 50 L-22 -18 Q-22 -34 -10 -40 L-10 -62 L10 -62 L10 -40 Q22 -34 22 -18 L22 50 Z', fill: c, opacity: .92 }, g); S('rect', { x: -12, y: -70, width: 24, height: 10, rx: 3, fill: '#2b2118' }, g); S('rect', { x: -22, y: 0, width: 44, height: 28, fill: '#fff', opacity: .9 }, g); return 18; },
      function (g, c) { S('path', { d: 'M-48 50 Q-54 -10 -40 -44 L40 -44 Q54 -10 48 50 Z', fill: c }, g); S('path', { d: 'M-40 -44 L-30 -56 L30 -56 L40 -44', fill: c, opacity: .7 }, g); S('rect', { x: -40, y: -10, width: 80, height: 30, rx: 4, fill: '#fff', opacity: .9 }, g); return 9; }
    ];
    var n = 0;
    function item(label, colour) {
      var outer = S('g', {}, items), g = S('g', { filter: sh }, outer), body = S('g', { transform: 'scale(1.4)' }, g);
      shapes[n % shapes.length](body, colour || '#5b7fd1');
      var tOuter = S('g', {}, tagLayer), tg = S('g', {}, tOuter);
      var words = String(label).split(' '), rows = [label];
      if (label.length > 10 && words.length > 1) { var cut = Math.ceil(words.length / 2); rows = [words.slice(0, cut).join(' '), words.slice(cut).join(' ')]; }
      var w = Math.max.apply(null, rows.map(function (r) { return r.length; })) * 10 + 26, h = rows.length * 20 + 12;
      S('line', { x1: 0, y1: -40, x2: 0, y2: -66 + h / 2, stroke: '#2b2118', 'stroke-width': 2 }, tg);
      S('rect', { x: -w / 2, y: -66 - h / 2, width: w, height: h, rx: 6, fill: '#fffdf6', stroke: colour || '#5b7fd1', 'stroke-width': 3, filter: sh }, tg);
      rows.forEach(function (r, k2) { T(0, -66 - h / 2 + 22 + k2 * 20, r, { 'text-anchor': 'middle', 'font-family': mono, 'font-size': 16, 'font-weight': 700, fill: '#2b2118' }, tg); });
      n += 1;
      return { g: [g, tg], place: function (x, y) { outer.setAttribute('transform', 'translate(' + x + ' ' + y + ')'); tOuter.setAttribute('transform', 'translate(' + x + ' ' + y + ')'); } };
    }
    return { item: item, slots: [[350, 372], [470, 372], [590, 372], [410, 330], [530, 330]], receipt: receipt, paper: paper, line: line, receiptLines: receiptLines, display: display };
  }

  window.ART = { coffeeStand: coffeeStand, bigCup: bigCup, storyLandscape: storyLandscape, theatre: theatre, cup: cup, pan: pan, twoLocks: twoLocks, basket: basket };
})();
