// Studio: the Beagle-deck look. Navy stage, light frame, shaded characters (the core's default actor).
window.LOOK = {
  name: 'studio',
  css: [
    '.ground{background:radial-gradient(640px 640px at 8% -12%,rgba(31,60,255,.42),transparent 70%),',
    'radial-gradient(600px 600px at 104% 112%,rgba(19,181,163,.34),transparent 70%),',
    'radial-gradient(rgba(255,255,255,.06) 1px,transparent 1.2px) 0 0/28px 28px,var(--stage-bg)}',
    '.overlay{background:radial-gradient(ellipse at 50% 45%,transparent 68%,rgba(0,0,10,.35))}',
    '[data-type=cast] .frame{background:linear-gradient(#fbfbfe,#eef0f7)}'
  ].join('')
};
