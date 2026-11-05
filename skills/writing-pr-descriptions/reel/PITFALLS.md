# Frame pitfalls

Known mistakes that frames are written against. Each one shipped or nearly shipped in a reel. Read this before writing a frame, and add to it when a contact sheet or a render catches something new.

## SVG

- **GSAP `x`/`y` on an SVG `<g>` overwrites its `transform` attribute.** The group jumps to the origin. Put the placement `transform` on an outer `<g>` and animate an inner one.
- **Text inside `<use>` loses the page's fonts.** The shadow tree falls back to a system face. Draw text as real `<text>` elements, not through `<use>`.

## Timing

- **A seek fires no `onUpdate`.** Snapshots and renders seek; anything painted from `onUpdate` (canvas, WebGL) shows the previous frame or nothing. Drive it from a property setter: `LIT.drive` for lit frames, or the same pattern by hand.
- **Per-tween painting depends on the order GSAP updates tweens in.** One driver tween that calls a pure `draw(t)` survives any seek. Ease inside `draw(t)` with `LIT.span` (`gsap.parseEase`), not with separate tweens.

## Lit 3D (`THREE_MODERN`)

- **`THREE` in a lit frame gets the r147 patches** (no colour management, linear output, legacy light units). Lit frames use `THREE_MODERN` only.
- **`preserveDrawingBuffer: false` gives blank snapshots.** The screenshot reads the canvas after the browser has cleared it. `LIT.stage` sets it.
- **Canvas text drawn before the fonts load keeps the fallback face.** Repaint after `document.fonts.ready`; `LIT.texture` does, when you pass it the stage.
- **`transmission` hazes whatever sits behind the glass.** A dial face behind it goes milky. Use `LIT.mat.glass()`: a faint clearcoat sheet, `opacity: 0.1`, `depthWrite: false`.
- **`PCFSoftShadowMap` is gone in r180 and later.** three warns and falls back to `PCFShadowMap`, whose `shadow.radius` gives the soft edge. `LIT.stage` and `LIT.rig` set both.

## Build

- **Per-reel files written to the skill folder.** They leak between reels and into commits. Write generated files (tonal effects, stems, baked blocks) under the build folder only.
- **ffmpeg `alimiter` lifts its output back to full scale** unless `level=0`. A limiter set to 0.5 then peaks at 1.0.
- **A long ffmpeg filter graph breaks the Windows command line** (32k characters). The build moves any graph over 6,000 characters into `-filter_complex_script`.

## Layout

- **Content below y = 900 sits under the captions.** Keep it above, or set `"captions": false` on the scene.
- **A block inset with `box` can clip at the frame edge.** Check the right and bottom edges on the contact sheet; the snapshot lint marks text that runs off the frame.
