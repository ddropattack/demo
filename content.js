// All on-screen content and the tour script live here. Edit freely.
//
// Panels are shown in tour order. `grid: [col, row, w, h]` places a panel on
// its paper's 2-column x 4-row grid; a 2x2 panel is a "hero" block that is
// simply rendered twice as large.
//
// Panel kinds:
//   cover    - hero image + facts + badges
//   figure   - single image (optional annotations) + bullets
//   frames   - flipbook; each frame has its own caption. `layered: true` stacks
//              frames (overlay-style SVGs). `extra` adds a click-only second
//              flipbook (skipped by the auto tour). `thumb` picks the frame
//              shown while the panel is not focused.
//   svgsteps - inline SVG whose elements appear per step via data-from/data-to
//   table    - impact rows, optionally next to an annotated photo
//
// Annotations are positioned in % of the image: {at:[x,y], label:[x,y], text}
// draws an arrow from the label to the target; {ring:[x,y,r]} draws a pulsing
// ring; {box:[x,y,w,h]} draws a dashed highlight box.
//
// Impact status: bad = affected, warn = partial/leakage, ok = not affected,
// na = not applicable.

const TALK = {
  title: 'Let’s Get Physical',
  subtitle: 'Low-Cost Memory Interposer Attacks on Confidential Computing',
};

// co-author institutions; each paper lists its own (`orgs`) in a row of logos at the bottom of its island
// (height in world px to balance their visual weight)
const ORGS = {
  cosic: { name: 'COSIC, KU Leuven', logo: 'assets/logos/cosiclogo.png', h: 300 },
  distrinet: { name: 'DistriNet, KU Leuven', logo: 'assets/logos/distrinet.svg', h: 130 },
  birmingham: { name: 'University of Birmingham', logo: 'assets/logos/birmingham.svg', h: 270 },
  luebeck: { name: 'University of Lübeck', logo: 'assets/logos/luebeck.svg', h: 340 },
  durham: { name: 'Durham University', logo: 'assets/logos/durham.svg', h: 280 },
  eth: { name: 'ETH Zurich', logo: 'assets/logos/eth.svg', h: 116 },
  google: { name: 'Google', logo: 'assets/logos/google.svg', h: 150 },
};

const TRANSITIONS = [
  {
    from: 'badram', to: 'battering',
    head: 'Patch:<br>alias checks',
    body: 'Battering RAM goes dynamic: an interposer that behaves during boot and turns malicious afterwards.',
  },
  {
    from: 'battering', to: 'ddrop',
    head: 'DDR5:<br>no aliasing',
    body: 'DDRop attacks freshness instead: silently drop DDR5 writes at native speed.',
  },
];

// ---- animated SEV-SNP attestation attack (BadRAM) ----
// Small helpers to keep the SVG below readable.
// `dl` delays the arrow within its step, so several arrows can draw one after another
const arrow = (x1, x2, y, label, from, cls = '', to, dl = 0) => {
  const dir = Math.sign(x2 - x1), hx = x2 - dir * 16;
  return `<g data-from="${from}"${to != null ? ` data-to="${to}"` : ''} class="msg ${cls}" style="--dl:${dl}s">
    <path class="draw" pathLength="1" d="M${x1},${y} H${hx}"/>
    <polygon class="hd" points="${x2},${y} ${hx},${y - 9} ${hx},${y + 9}"/>
    <text x="${(x1 + x2) / 2}" y="${y - 14}">${label}</text></g>`;
};
const at = (from, to, inner) => `<g data-from="${from}"${to != null ? ` data-to="${to}"` : ''}>${inner}</g>`;

const ATTEST_SVG = `
<svg viewBox="0 0 1000 640" class="seq" text-anchor="middle">
  <g class="actors">
    <rect x="30" y="16" width="200" height="64" rx="12" class="actor"/><text x="130" y="57">Guest owner</text>
    <rect x="290" y="16" width="200" height="64" rx="12" class="actor evil"/><text x="390" y="57">Hypervisor 😈</text>
    <rect x="550" y="16" width="200" height="64" rx="12" class="actor trusted"/><text x="650" y="57">Secure Proc.</text>
    <rect x="800" y="16" width="180" height="150" rx="12" class="actor mem"/><text x="890" y="57">DRAM</text>
    <text x="890" y="90" class="small" style="font-size:19px">launch digest</text>
    <rect x="818" y="102" width="144" height="50" rx="8" class="cell"/>
    <path d="M130,80 V625 M390,80 V625 M650,80 V625 M890,166 V625" class="life"/>
  </g>
  ${at(0, 0, '<text x="890" y="137" class="cellv good late" style="--late:2.9s">hash(A)</text>')}
  ${at(1, 4, '<text x="890" y="137" class="cellv good">hash(A)</text>')}
  ${at(5, 5, '<text x="890" y="137" class="cellv bad">hash(B)</text>')}
  ${at(6, null, '<text x="890" y="137" class="cellv replay">hash(A)</text>')}

  <!-- base case: an honest launch, start to finish -->
  ${arrow(130, 390, 215, 'run image A', 0, '', 0, 0.2)}
  ${arrow(390, 650, 280, 'launch image A', 0, '', 0, 1.2)}
  ${arrow(650, 890, 345, 'store hash(A)', 0, '', 0, 2.2)}
  ${arrow(650, 130, 430, 'attest: hash(A) ✓', 0, 'ok', 0, 3.4)}
  ${at(0, 0, '<rect x="35" y="96" width="190" height="44" rx="10" class="trusted late" style="--late:4.3s"/><text x="130" y="125" class="small late" style="--late:4.3s">A is running ✓</text>')}

  ${arrow(390, 650, 215, 'launch image A', 1, '', 1)}
  ${arrow(650, 890, 255, 'store hash(A)', 1, '', 1)}
  ${arrow(890, 390, 215, 'copy via BadRAM alias', 2, 'alias', 2)}
  ${at(2, null, '<rect x="300" y="240" width="180" height="44" rx="10" class="loot"/><text x="390" y="270" class="small">saved: hash(A)</text>')}
  ${arrow(130, 390, 340, 'run image A', 3)}
  ${arrow(390, 650, 395, 'launch image B', 4, 'evil')}
  ${arrow(650, 890, 440, 'store hash(B)', 5, 'evil')}
  ${arrow(390, 890, 500, 'replay hash(A) via alias', 6, 'alias')}
  ${arrow(650, 130, 580, 'attest: hash(A) ✓', 7, 'ok')}
  ${at(7, null, '<rect x="35" y="96" width="190" height="44" rx="10" class="fooled"/><text x="130" y="125" class="small">looks genuine!</text>')}
</svg>`;

// ---- animated interposer diagram (Battering RAM), after Figure 5 of the paper ----
// The svg root gets classes s0..sN for every step reached, so CSS can animate
// persistent changes (the switch lever stays flipped). Variants:
//   'single'   one switch grounds A13 (the main loop)
//   'redirect' A13 is grounded and its CPU value rerouted to the unused A17 (keeps RCD parity)
//   'dual'     two switches ground A13 and A11 together (keeps RCD parity when both are equal)
const ALIAS_SVG = mode => {
  const bits = ['A17', 'A16', 'A15', 'A14', 'A13', 'A12', 'A11', 'A10', 'A9'];
  const X0 = 215, CW = 86, cx = i => X0 + i * CW + CW / 2;
  const SWS = mode === 'dual' ? [4, 6] : [4], sx = cx(4);
  const DY = 74, CY = 440, H = 58;          // DRAM row top, CPU row top, cell height
  const PIV = 236, CT = 318;                // switch pivot and contact height
  const row = (y, name) => bits.map((b, i) => `
    <rect x="${X0 + i * CW + 3}" y="${y}" width="${CW - 6}" height="${H}" rx="7" class="bit${i < 2 ? ' ghost' : ''}${SWS.includes(i) ? ' ' + name + 'sw' : ''}${mode === 'redirect' && i === 0 ? ' ' + name + 'redir' : ''}"/>
    <text x="${cx(i)}" y="${y + 39}" class="bitt${i < 2 ? ' ghost' : ''}">${b}</text>`).join('');
  const tip = x => `<polygon points="${x},${DY + H} ${x - 8},${DY + H + 15} ${x + 8},${DY + H + 15}" class="tip`;
  // straight-through wires; during boot each one lights up once, left to right
  let w = '', sweep = '', thru = '', sw = '', zero = '', flip = '';
  for (let i = 2; i < bits.length; i++) {
    const s = SWS.includes(i), c = cx(i);
    if (!s) w += `<path d="M${c},${CY} V${DY + H + 14}" class="wire"/>${tip(c)}"/>`;
    const d = s ? `M${c - 24},${CY} V${CT} L${c},${PIV} V${DY + H + 14}` : `M${c},${CY} V${DY + H + 14}`;
    sweep += `<path d="${d}" pathLength="1" class="sweep draw" style="--dl:${(0.3 + (i - 2) * 0.12).toFixed(2)}s"/>`;
    // after the flip, the other lines still pass straight through
    if (!s) thru += `<path d="${d}" pathLength="1" class="sweep draw" style="--dl:${(1.4 + (i - 2) * 0.12).toFixed(2)}s"/>`;
    if (!s) continue;
    // the line runs through an analog switch: pass-through, or tied to ground
    const L = c - 24, G = c + 24;
    sw += `<path d="M${c},${PIV} V${DY + H + 14}" class="wire swup"/>${tip(c)} swup"/>
      <path d="M${L},${CT} V${CY}" class="wire swcpu"/>
      <path d="M${G},${CT} V${CT + 30} M${G - 18},${CT + 30} h36 M${G - 11},${CT + 38} h22 M${G - 4},${CT + 46} h8" class="gnd"/>
      <circle cx="${L}" cy="${CT}" r="7" class="pin"/><circle cx="${G}" cy="${CT}" r="7" class="pin"/>
      <line x1="${c}" y1="${PIV}" x2="${L}" y2="${CT}" class="lever" style="transform-origin:${c}px ${PIV}px"/>
      <circle cx="${c}" cy="${PIV}" r="8" class="pin"/>
      <path d="M${c - 46},${PIV + 52} q46,34 92,0" class="flip"/><polygon points="${c + 52},${PIV + 46} ${c + 34},${PIV + 48} ${c + 44},${PIV + 62}" class="fliphd"/>`;
    // after the flip, ground drives the DIMM's line
    zero += `<path d="M${G},${CT + 30} V${CT} L${c},${PIV} V${DY + H + 14}" pathLength="1" class="sweep bad draw" style="--dl:.7s"/>
      <text x="${c + 30}" y="${DY + H + 46}" class="zero late" style="--late:1.3s" text-anchor="start">0</text>`;
    // the CPU still sends 0 or 1 on it
    flip += `<g class="cpuflip"><text x="${c}" y="${CY + H + 34}" class="bval f0">${bits[i]} = 0</text><text x="${c}" y="${CY + H + 34}" class="bval f1">${bits[i]} = 1</text></g>`;
  }
  // redirect: the CPU's A13 value goes to A17, which this DIMM ignores
  const RY = PIV - 16;
  const redir = mode !== 'redirect' ? '' : `
    <path d="M${sx - 24},${CY} V${CT} L${sx - 24},${RY} H${cx(0)} V${DY + H + 14}" pathLength="1" class="sweep redir draw" style="--dl:1.1s"/>
    ${tip(cx(0))} redirhd late" style="--late:1.7s"/>`;
  const redirFlip = mode !== 'redirect' ? '' : `<g class="cpuflip"><text x="${cx(0)}" y="${DY - 14}" class="bval f0">A17 = 0</text><text x="${cx(0)}" y="${DY - 14}" class="bval f1">A17 = 1</text></g>`;
  return `
<svg viewBox="0 0 1000 540" class="seq alias" text-anchor="middle">
  <text x="20" y="${DY + 40}" text-anchor="start" class="rowl">DRAM</text>
  <text x="20" y="${PIV + 58}" text-anchor="start" class="rowl">Interposer</text>
  <text x="20" y="${CY + 40}" text-anchor="start" class="rowl">CPU</text>
  ${at(0, 1, `<text x="${X0 + CW}" y="${DY - 14}" class="small">unused by DIMM</text>`)}
  ${mode === 'redirect' ? '' : at(2, null, `<text x="${X0 + CW}" y="${DY - 14}" class="small">unused by DIMM</text>`)}
  <rect x="205" y="${PIV - 34}" width="790" height="176" rx="16" class="ibox"/>
  ${row(DY, 'dram')}
  ${row(CY, 'cpu')}
  ${w}
  ${sw}
  ${at(0, 0, `${sweep}<rect x="${sx + 45}" y="${DY - 50}" width="310" height="44" rx="12" class="passbox late" style="--late:1.5s"/>
    <text x="${sx + 200}" y="${DY - 20}" class="small strong ok late" style="--late:1.5s">boot check: no aliases ✓</text>`)}
  ${at(1, 1, thru)}
  ${at(1, null, zero + redir)}
  ${at(2, null, `${flip}${redirFlip}
    <rect x="${sx + 45}" y="${DY - 50}" width="310" height="44" rx="12" class="fooled"/><text x="${sx + 200}" y="${DY - 20}" class="small strong">${mode === 'dual' ? 'equal bits: same DRAM row' : 'both: same DRAM row'}</text>`)}
</svg>`;
};

// Generic animation helpers for the live diagrams:
//  - data-from/data-to: element visible for steps in [from, to]
//  - fly(at, ...): a value that flies from (sx,sy) to (x,y) when step `at` starts
//  - class "late": appears only after the fly has landed
//  - data-at + class "loop": looping animation while step `at` is shown
const fly = (at, x, y, sx, sy, label, cls = '') => `
  <g class="fly ${cls}" data-at="${at}" style="--fx:${sx - x}px;--fy:${sy - y}px">
    <rect x="${x - 82}" y="${y - 22}" width="164" height="44" rx="10"/><text x="${x}" y="${y + 9}">${label}</text></g>`;

// route(at, points, ...): like fly, but the value travels along a polyline (e.g. a wire),
// pausing nowhere; each route gets its own keyframes, timed by segment length.
// `dl`/`dur` (s) let several routes chain into one journey
let routeN = 0;
const route = (at, pts, label, cls = '', dl = 0.2, dur = 2.2) => {
  const [x, y] = pts[pts.length - 1], name = 'route' + routeN++;
  const seg = pts.slice(1).map((q, i) => Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]));
  const total = seg.reduce((a, b) => a + b, 0);
  let acc = 0;
  const steps = pts.map((q, i) => {
    if (i) acc += seg[i - 1];
    const pct = (6 + 76 * acc / total).toFixed(1);
    return `${pct}% { transform: translate(${q[0] - x}px, ${q[1] - y}px); opacity: 1; }`;
  });
  return `<style>@keyframes ${name} { 0% { transform: translate(${pts[0][0] - x}px, ${pts[0][1] - y}px); opacity: 0; }
    ${steps.join(' ')} 100% { transform: none; opacity: 0; } }</style>
  <g class="fly route ${cls}" data-at="${at}" style="--route:${name};--rdl:${dl}s;--dur:${dur}s">
    <rect x="${x - 82}" y="${y - 22}" width="164" height="44" rx="10"/><text x="${x}" y="${y + 9}">${label}</text></g>`;
};

// ---- Scalable SGX plaintext access (Battering RAM), after Figure 7 of the paper ----
// Two address lanes: the attacker enclave (A, top) and the victim (V, bottom). TME at
// the CPU's edge en/decrypts with one key, tweaked by the address, so values change
// form there and DRAM only holds ciphertext. The active interposer reroutes lane A
// onto the victim's DRAM row.
const SGX_SVG = (() => {
  const A = 250, V = 410, CX = 150, TX = 340, IX = 560, DX = 840;   // lane y's; cell, TME, interposer, DRAM x
  const LIVE = [[2, 3], [5, null]];                                 // steps with the interposer switched on
  const live = inner => LIVE.map(([f, t]) => at(f, t, inner)).join('');
  const idle = inner => at(0, 1, inner) + at(4, 4, inner);
  const cell = (y, cls, label) => `<rect x="45" y="${y - 30}" width="210" height="60" rx="8" class="region ${cls}"/>
    <text x="${CX}" y="${y - 40}" class="small">${label}</text>`;
  const dcell = (y, cls = '') => `<rect x="725" y="${y - 30}" width="230" height="60" rx="8" class="cellbox ${cls}"/>`;
  const val = (from, to, x, y, cls, v, late) => at(from, to,
    `<text x="${x}" y="${y + 10}" class="val ${cls}${late ? ' late" style="--late:' + late + 's' : ''}">${v}</text>`);
  // TME lights up where a value crosses it
  const flash = (step, y, t) => at(step, step, `<rect x="${TX - 44}" y="${y - 32}" width="88" height="64" rx="8" class="eflash late" style="--late:${t}s"/>`);
  return `
<svg viewBox="0 0 1000 540" class="seq sgx" text-anchor="middle">
  <rect x="20" y="80" width="390" height="420" rx="14" class="dev"/><text x="${CX}" y="125" class="devl">CPU</text>
  <rect x="${TX - 50}" y="100" width="100" height="380" rx="12" class="dev tme"/>
  <text x="${TX}" y="140" class="devl tmel">TME</text><text x="${TX}" y="166" class="small tmes">one key</text>
  <text x="${TX}" y="444" class="small tmes">tweak =</text><text x="${TX}" y="468" class="small tmes">address</text>
  <rect x="700" y="80" width="280" height="420" rx="14" class="dev mem"/><text x="${DX}" y="125" class="devl">DRAM</text>
  <rect x="${IX - 40}" y="50" width="80" height="470" rx="12" class="izone"/><text x="${IX}" y="40" class="small acc">interposer</text>
  ${live(`<rect x="${IX - 40}" y="50" width="80" height="470" rx="12" class="izone hot"/>`)}

  <!-- address lanes; while the interposer is on, lane A is cut off from its own row and rerouted -->
  <path d="M${TX + 50},${A} H${IX}" class="bus"/><path d="M${TX + 50},${V} H725" class="bus"/>
  ${idle(`<path d="M${IX},${A} H725" class="bus"/>`)}
  ${live(`<path d="M${IX},${A} H725" class="bus dead"/>
    <path d="M${TX + 50},${A} H${IX} V${V} H725" pathLength="1" class="alias draw" style="--dl:.2s"/>`)}
  <path d="M255,${A} H${TX - 50} M255,${V} H${TX - 50}" class="inner"/>

  <!-- CPU side: plaintext -->
  ${at(1, null, `<g class="late" style="--late:.2s">${cell(A, 'att', 'attacker enclave')}</g>`)}
  ${at(0, 3, cell(V, 'vic', 'victim enclave'))}
  ${at(4, null, cell(V, 'att2', 'attacker enclave 2'))}
  ${val(0, 3, CX, V, 'plain', 'dead beef')}
  ${val(4, 5, CX, V, 'muted', '????')}
  ${val(6, null, CX, V, 'win', 'dead beef', 1.9)}
  ${val(3, null, CX, A, 'gib', '02a9 1fb3', 2.4)}

  <!-- DRAM side: ciphertext only -->
  ${idle(dcell(A))}${live(`<rect x="725" y="${A - 30}" width="230" height="60" rx="8" class="gone"/><text x="${DX}" y="${A + 8}" class="small">unreachable</text>`)}
  ${at(0, 3, dcell(V))}${at(4, null, dcell(V, 'att2'))}
  ${val(0, 3, DX, V, 'ct', '27f3 dc66', 2.0)}
  ${val(4, 4, DX, V, 'ct', '5b1e 0c94')}
  ${val(5, null, DX, V, 'ct', '27f3 dc66', 2.5)}

  <!-- step 0: the victim's write is encrypted on its way out -->
  ${route(0, [[CX, V], [TX, V]], 'dead beef', 'pt', 0.3, 0.7)}${flash(0, V, 0.95)}
  ${route(0, [[TX, V], [DX, V]], '27f3 dc66', 'ct', 1.0, 1.0)}
  <!-- step 3: capture through the alias, decrypted under the wrong address -->
  ${route(3, [[DX, V], [IX, V], [IX, A], [TX, A]], '27f3 dc66', 'ct', 0.2, 1.4)}${flash(3, A, 1.55)}
  ${route(3, [[TX, A], [CX, A]], '02a9 1fb3', 'gib', 1.6, 0.8)}
  <!-- step 5: replay, encrypted under the same wrong address: the victim's ciphertext again -->
  ${route(5, [[CX, A], [TX, A]], '02a9 1fb3', 'gib', 0.3, 0.7)}${flash(5, A, 0.95)}
  ${route(5, [[TX, A], [IX, A], [IX, V], [DX, V]], '27f3 dc66', 'ct', 1.0, 1.4)}
  <!-- step 6: enclave 2 reads its own address: correct tweak, plaintext -->
  ${route(6, [[DX, V], [TX, V]], '27f3 dc66', 'ct', 0.2, 1.0)}${flash(6, V, 1.15)}
  ${route(6, [[TX, V], [CX, V]], 'dead beef', 'win', 1.2, 0.7)}
  ${at(6, null, `<g class="late" style="--late:2.1s"><rect x="20" y="22" width="200" height="48" rx="12" class="okbox"/><text x="120" y="55" class="okt">✓ plaintext!</text></g>`)}
</svg>`;
})();

// ---- SEV-SNP attestation, again (Battering RAM): same visual language as the SGX diagram ----
// Lanes: the hypervisor's own buffer (H, top), the VM image (I) and the launch digest (L).
// The memory controller encrypts VM memory with per-VM keys; the hypervisor's own buffer
// is not encrypted, so ciphertext captured through the alias passes through unchanged.
const SEV_SVG = (() => {
  const H = 210, I = 320, L = 430, CX = 158, EX = 340, IX = 560, DX = 840;
  const LIVE = [[5, null]];                                          // interposer switched on
  const live = inner => LIVE.map(([f, t]) => at(f, t, inner)).join('');
  const idle = inner => at(1, 4, inner);
  const cell = (y, cls, label) => `<rect x="62" y="${y - 30}" width="193" height="60" rx="8" class="region ${cls}"/>
    <text x="${CX}" y="${y - 40}" class="small">${label}</text>`;
  const dcell = (y, cls = '') => `<rect x="725" y="${y - 30}" width="230" height="60" rx="8" class="cellbox ${cls}"/>`;
  const val = (from, to, x, y, cls, v, late) => at(from, to,
    `<text x="${x}" y="${y + 10}" class="val ${cls}${late ? ' late" style="--late:' + late + 's' : ''}">${v}</text>`);
  const flash = (step, y, t) => at(step, step, `<rect x="${EX - 44}" y="${y - 32}" width="88" height="64" rx="8" class="eflash late" style="--late:${t}s"/>`);
  // the Secure Processor measures the image into the launch digest
  const measure = (step, dl) => at(step, step, `<path d="M62,${I + 12} C30,${I + 12} 30,${L - 12} 54,${L - 12}" pathLength="1" class="measure draw" style="--dl:${dl}s"/>
    <polygon points="62,${L - 12} 50,${L - 20} 50,${L - 4}" class="measurehd late" style="--late:${dl + 0.6}s"/>`);
  return `
<svg viewBox="0 0 1000 540" class="seq sgx sev" text-anchor="middle">
  <rect x="20" y="80" width="390" height="420" rx="14" class="dev"/><text x="${CX}" y="125" class="devl">CPU</text>
  <rect x="${EX - 50}" y="100" width="100" height="380" rx="12" class="dev tme"/>
  <text x="${EX}" y="136" class="devl tmel">SEV</text><text x="${EX}" y="160" class="small tmes">per-VM</text><text x="${EX}" y="182" class="small tmes">keys</text>
  <rect x="700" y="80" width="280" height="420" rx="14" class="dev mem"/><text x="${DX}" y="125" class="devl">DRAM</text>
  ${at(0, 0, `<g class="late" style="--late:.6s"><rect x="${IX - 160}" y="26" width="320" height="44" rx="12" class="passbox"/>
    <text x="${IX}" y="56" class="small strong ok">boot check: no aliases ✓</text></g>`)}
  ${at(1, null, `<g class="late" style="--late:.2s"><rect x="${IX - 40}" y="50" width="80" height="470" rx="12" class="izone"/><text x="${IX}" y="40" class="small acc">interposer</text></g>`)}
  ${live(`<rect x="${IX - 40}" y="50" width="80" height="470" rx="12" class="izone hot"/>`)}

  <!-- address lanes; while the interposer is on, the buffer lane is rerouted onto the launch digest -->
  <path d="M${EX + 50},${I} H725 M${EX + 50},${L} H725" class="bus"/>
  ${at(4, null, `<path d="M${EX + 50},${H} H${IX}" class="bus"/>`)}
  ${at(4, 4, `<path d="M${IX},${H} H725" class="bus"/>`)}
  ${live(`<path d="M${IX},${H} H725" class="bus dead"/>
    <path d="M${EX + 50},${H} H${IX} V${L} H725" pathLength="1" class="alias draw" style="--dl:.2s"/>`)}
  <path d="M255,${I} H${EX - 50} M255,${L} H${EX - 50}" class="inner"/>
  ${at(4, null, `<path d="M255,${H} H${EX - 50}" class="inner"/>`)}

  <!-- CPU side -->
  ${at(4, null, `<g class="late" style="--late:.2s">${cell(H, 'att', 'hypervisor buffer')}</g>`)}
  ${at(2, 6, `<g class="late" style="--late:.2s">${cell(I, 'img', 'VM image')}</g>`)}
  ${at(7, null, cell(I, 'att2', 'VM image'))}
  ${cell(L, 'vic', 'launch digest')}
  ${val(2, 6, CX, I, 'good late', 'image A', 0.2)}
  ${val(7, null, CX, I, 'gib', 'image B 😈')}
  ${val(3, 6, CX, L, 'plain', 'hash(A)', 1.0)}
  ${val(7, 8, CX, L, 'plain', 'hash(B)', 2.6)}
  ${val(9, null, CX, L, 'plain', 'hash(A)', 1.9)}
  ${val(6, null, CX, H, 'ct', 'a26d 23f0', 2.0)}

  <!-- DRAM side: ciphertext only -->
  ${at(4, 4, `<g class="late" style="--late:.2s">${dcell(H)}</g>`)}
  ${live(`<rect x="725" y="${H - 30}" width="230" height="60" rx="8" class="gone"/><text x="${DX}" y="${H + 8}" class="small">unreachable</text>`)}
  ${dcell(I)}${dcell(L)}
  ${val(2, 6, DX, I, 'ct', 'c7e1 09ab', 2.0)}
  ${val(7, null, DX, I, 'ct', '51fd 3e22', 1.8)}
  ${val(3, 6, DX, L, 'ct', 'a26d 23f0', 2.0)}
  ${val(7, 7, DX, L, 'ct', '77b0 c4e9', 3.4)}
  ${val(8, null, DX, L, 'ct', 'a26d 23f0', 2.2)}

  <!-- ② launch image A: encrypted with the VM's key on its way out -->
  ${route(2, [[CX, I], [EX, I]], 'image A', 'win', 0.5, 0.6)}${flash(2, I, 1.05)}
  ${route(2, [[EX, I], [DX, I]], 'c7e1 09ab', 'ct', 1.1, 0.9)}
  <!-- ③ the Secure Processor measures it into the launch digest -->
  ${measure(3, 0.2)}
  ${route(3, [[CX, L], [EX, L]], 'hash(A)', 'pt', 1.1, 0.6)}${flash(3, L, 1.6)}
  ${route(3, [[EX, L], [DX, L]], 'a26d 23f0', 'ct', 1.7, 0.9)}
  <!-- ⑥ capture: the hypervisor's buffer is not encrypted, so it receives the raw ciphertext -->
  ${route(6, [[DX, L], [IX, L], [IX, H], [EX, H]], 'a26d 23f0', 'ct', 0.2, 1.2)}
  ${route(6, [[EX, H], [CX, H]], 'a26d 23f0', 'ct', 1.4, 0.6)}
  <!-- ⑦ the backdoored image B is launched and measured -->
  ${route(7, [[CX, I], [EX, I]], 'image B', 'gib', 0.3, 0.6)}${flash(7, I, 0.85)}
  ${route(7, [[EX, I], [DX, I]], '51fd 3e22', 'ct', 0.9, 0.9)}
  ${measure(7, 1.6)}
  ${route(7, [[CX, L], [EX, L]], 'hash(B)', 'pt', 2.4, 0.5)}${flash(7, L, 2.85)}
  ${route(7, [[EX, L], [DX, L]], '77b0 c4e9', 'ct', 2.9, 0.8)}
  <!-- ⑧ replay the captured ciphertext into the launch digest -->
  ${route(8, [[CX, H], [EX, H]], 'a26d 23f0', 'ct', 0.3, 0.5)}
  ${route(8, [[EX, H], [IX, H], [IX, L], [DX, L]], 'a26d 23f0', 'ct', 0.8, 1.3)}
  <!-- ⑨ attestation reads the digest back: hash(A), while image B runs -->
  ${route(9, [[DX, L], [EX, L]], 'a26d 23f0', 'ct', 0.2, 0.9)}${flash(9, L, 1.1)}
  ${route(9, [[EX, L], [CX, L]], 'hash(A)', 'pt', 1.2, 0.6)}
  ${at(9, null, `<g class="late" style="--late:2.1s"><rect x="20" y="22" width="270" height="48" rx="12" class="fooledbox"/><text x="155" y="55" class="foolt">attests as image A!</text></g>`)}
</svg>`;
})();

// ---- DDR5 write dropping (DDRop) ----
const PARITY_SVG = `
<svg viewBox="0 0 1000 540" class="seq parity" text-anchor="middle">
  <rect x="20" y="80" width="150" height="380" rx="14" class="dev"/><text x="95" y="275" class="devl">CPU</text>
  <rect x="572" y="62" width="414" height="410" rx="18" class="dimm"/><text x="779" y="456" class="small">DDR5 DIMM</text>
  <rect x="600" y="110" width="120" height="180" rx="14" class="dev"/><text x="660" y="160" class="devl">RCD</text>
  <rect x="820" y="110" width="150" height="260" rx="14" class="dev mem"/><text x="895" y="152" class="devl">DRAM</text>
  <rect x="340" y="40" width="120" height="460" rx="12" class="izone"/><text x="400" y="30" class="small acc">interposer</text>
  ${at(1, 2, '<rect x="340" y="40" width="120" height="460" rx="12" class="izone hot"/>')}

  <!-- commands go through the RCD; data runs straight between DRAM and CPU -->
  <path d="M170,220 H600 M720,220 H820" class="bus"/><text x="515" y="206" class="small">command</text>
  <path d="M170,340 H820" class="bus data"/><text x="515" y="326" class="small">data</text>
  <!-- ALERT is split at the interposer: while it is cut, the CPU side goes dead -->
  <path d="M660,290 V420 H400" class="bus alert"/><path d="M400,420 H178" class="bus alert dead"/>
  <polygon points="170,420 186,411 186,429" class="alerthd dead"/><text x="250" y="408" class="small">ALERT</text>

  <rect x="840" y="250" width="110" height="56" rx="8" class="cellbox"/>
  ${at(0, 0, '<text x="895" y="287" class="val good late0">new</text>')}
  ${at(1, null, '<text x="895" y="287" class="val bad">old</text><text x="895" y="336" class="small">write lost</text>')}
  ${at(2, 2, '<path d="M380,402 l40,36 M420,402 l-40,36" class="cut"/>')}

  <g class="loop pkt-ok" data-at="0"><rect x="150" y="200" width="76" height="40" rx="8" class="pkt"/><text x="188" y="228" class="pktt">WR</text></g>
  <g class="loop pkt-bad" data-at="1"><rect x="150" y="200" width="76" height="40" rx="8" class="pkt"/><text x="188" y="228" class="pktt">WR</text></g>
  <g class="loop pkt-bad" data-at="2"><rect x="150" y="200" width="76" height="40" rx="8" class="pkt"/><text x="188" y="228" class="pktt">WR</text></g>
  <g class="loop bolt" data-at="1"><path d="M408,120 l-26,46 h22 l-14,42 l36,-56 h-22 l14,-32 z"/></g>
  <g class="loop bolt" data-at="2"><path d="M408,120 l-26,46 h22 l-14,42 l36,-56 h-22 l14,-32 z"/></g>
  <g class="loop rcd-err" data-at="1"><text x="660" y="98" class="errt">parity!</text></g>
  <g class="loop rcd-err" data-at="2"><text x="660" y="98" class="errt">parity!</text></g>
  <g class="loop alert-full" data-at="1"><circle cx="660" cy="290" r="13" class="pulse"/></g>
  <g class="loop alert-cut" data-at="2"><circle cx="660" cy="290" r="13" class="pulse"/></g>
  <g class="loop cpu-err" data-at="1"><rect x="15" y="22" width="160" height="50" rx="12" class="errbox"/><text x="95" y="57" class="errt">error!</text></g>
  <g class="loop cpu-ok" data-at="2"><rect x="15" y="22" width="160" height="50" rx="12" class="okbox"/><text x="95" y="57" class="okt">✓ write OK</text></g>
  <g class="loop pkt-rd" data-at="3"><rect x="150" y="200" width="76" height="40" rx="8" class="pkt rd"/><text x="188" y="228" class="pktt">RD</text></g>
  <g class="loop ret-old" data-at="3"><rect x="744" y="320" width="76" height="40" rx="8" class="retbox"/><text x="782" y="348" class="pktt dark">old</text></g>
  <g class="loop cpu-got" data-at="3"><rect x="5" y="22" width="180" height="50" rx="12" class="errbox"/><text x="95" y="57" class="errt">stale data!</text></g>
</svg>`;

// ---- TDX attribute corruption (DDRop), after Figure 9 of the paper ----
// Step 0: the TDCS field table. Step 1: zoom into the first 32 bits of the
// attributes; the bit names appear left to right. Step 2: the whole 16-byte AES
// block (attributes + xfam) is overwritten under another key, so the bits flicker.
// Step 3: the bits settle at random; debug lands on 1 last.
const TDCS_SVG = (() => {
  // zoomed bit row (top): name cells above, bit values below
  const BX = 70, BW = 810, CW = BW / 32, STUB = 50, LY = 72, LH = 100, VY = LY + LH, VH = 50;
  const cx = i => BX + i * CW + CW / 2;
  const named = { 0: 'debug', 7: 'pmt_prof', 16: 'icssd', 27: 'lass', 28: 'sept_ve_d', 29: 'migratbl', 30: 'pks', 31: 'kl' };
  const prod = Array(32).fill('0'); prod[28] = '1'; prod[30] = '1';           // clean production config, debug = 0
  const rnd = '10110100111001010110100100111011'.split('');                   // random after corruption, debug = 1

  // the TDCS field table (bottom), one column per byte as in the paper
  const TX = 130, BY = 25, RH = 44, TY = 310;
  const rows = [
    ['0x60', [['', 8, 'g'], ['num_l2_vms', 16], ['', 8, 'g']]],
    ['0x80', [['attributes', 8, 'attr'], ['xfam', 8], ['max_vcpus', 4, 'sm'], ['gpaw', 1, 'v'], ['', 3, 'g'], ['eptp', 8]]],
    ['0xa0', [['sept|lock', 2, 'two'], ['', 6, 'g'], ['tsc_offset', 8], ['tsc_multiplier', 8], ['tsc|freq', 2, 'two'], ['cpuid_flags', 6]]],
    ['0xc0', [['cpuid_flags', 26], ['', 2, 'g'], ['xbuff_size', 4, 'sm']]],
  ];
  let table = [0, 8, 16, 24, 31].map(b => `<text x="${TX + b * BY + BY / 2}" y="${TY - 10}" class="scale">${b}</text>`).join('');
  rows.forEach(([off, fields], r) => {
    const y = TY + r * RH;
    let x = TX, g = `<text x="${TX - 14}" y="${y + 29}" class="off${r === 1 ? ' hot' : ''}">${off}</text>`;
    fields.forEach(([n, bytes, cls = '']) => {
      const w = bytes * BY, mx = x + w / 2;
      g += `<rect x="${x}" y="${y}" width="${w}" height="${RH}" class="trow ${cls}"/>`;
      if (cls === 'two') { const [a, b] = n.split('|'); g += `<text x="${mx}" y="${y + 19}" class="tfield xs">${a}</text><text x="${mx}" y="${y + 37}" class="tfield xs">${b}</text>`; }
      else if (cls === 'v') g += `<text transform="translate(${mx + 5},${y + RH - 5}) rotate(-90)" text-anchor="start" class="tfield xs">${n}</text>`;
      else if (n) g += `<text x="${mx}" y="${y + 30}" class="tfield ${cls}">${n}</text>`;
      x += w;
    });
    table += `<g class="rowin" style="--late:${(0.15 + r * 0.14).toFixed(2)}s">${g}</g>`;
  });
  table += `<text x="${TX + 16 * BY}" y="${TY + 4 * RH + 18}" class="tfield">…</text>`;

  // the zoom: the 64-bit attributes field blows up into the bit row (bits 0-31, then a stub for 32-63)
  const SX = TX, SY = TY + RH, SW = 8 * BY, ZW = BW + STUB;
  const gsx = SW / ZW, gsy = RH / (LH + VH);
  const grow = `style="--gx:${(SX - BX * gsx).toFixed(1)}px;--gy:${(SY - LY * gsy).toFixed(1)}px;--gsx:${gsx.toFixed(4)};--gsy:${gsy.toFixed(4)}"`;
  let frame = '', labels = '', vals = '', flick2 = '', settle = '';
  for (let i = 0; i < 32; i++) {
    const x = BX + i * CW;
    if (named[i] != null) {
      frame += `<rect x="${x}" y="${LY}" width="${CW}" height="${LH}" class="lcell"/>`;
      // the animated <g> must not carry the rotate(): a CSS transform would replace it
      labels += `<g class="blabel late${i === 0 ? ' hot' : ''}" style="--late:${(1.25 + i * 0.035).toFixed(2)}s">
        <text transform="translate(${cx(i) + 5},${VY - 8}) rotate(-90)" text-anchor="start">${named[i]}</text></g>`;
    }
    frame += `<rect x="${x}" y="${VY}" width="${CW}" height="${VH}" class="bitc"/>`;
    vals += `<text x="${cx(i)}" y="${VY + 36}" class="bv late${i === 0 ? ' zero' : ''}" style="--late:${(1.25 + i * 0.035).toFixed(2)}s">${prod[i]}</text>`;
    // flickering bits: f0/f1 alternate at a per-bit rate
    const t = (0.22 + ((i * 37) % 11) / 22).toFixed(2), dl = (((i * 53) % 9) / 12).toFixed(2);
    const flick = (at, extra = '', st = '') => `<g data-at="${at}" class="flick${extra}" style="--t:${t}s;--dl:${dl}s${st}">
      <text x="${cx(i)}" y="${VY + 36}" class="bv f0">0</text><text x="${cx(i)}" y="${VY + 36}" class="bv f1">1</text></g>`;
    flick2 += flick(2);
    // on the coin flip, the bits settle one by one; debug lands last
    const d = i === 0 ? 1.9 : 0.25 + ((i * 7) % 31) * 0.04;
    settle += flick(3, ' vanish', `;--late:${d.toFixed(2)}s`) +
      `<text x="${cx(i)}" y="${VY + 36}" class="bv late${i === 0 ? ' set' : ''}" style="--late:${d.toFixed(2)}s">${rnd[i]}</text>`;
  }
  // reserved bit ranges: grey cells in the name row
  [[1, 6], [8, 15], [17, 26]].forEach(([a, b]) => { frame += `<rect x="${BX + a * CW}" y="${LY}" width="${(b - a + 1) * CW}" height="${LH}" class="lcell g"/>`; });
  frame += `<rect x="${BX + BW}" y="${LY}" width="${STUB}" height="${LH + VH}" class="lcell g"/>
    <text x="${BX + BW + STUB / 2}" y="${VY + 30}" class="scale">…</text>`;
  const marks = [0, 8, 16, 24, 31].map(i => `<text x="${cx(i)}" y="${LY - 10}" class="scale">${i}</text>`).join('') +
    `<text x="${BX + BW + STUB / 2}" y="${LY - 10}" class="scale">63</text>`;
  const dbg = cls => `<rect x="${BX - 3}" y="${LY - 3}" width="${CW + 6}" height="${LH + VH + 6}" rx="4" class="dbgbox ${cls}"/>`;
  const zoom = `<rect x="${SX}" y="${SY}" width="${SW}" height="${RH}" rx="3" class="zoomsrc"/>
    <path d="M${BX},${VY + VH} L${SX},${SY}" pathLength="1" class="zoomline draw" style="--dl:.55s"/>
    <path d="M${BX + ZW},${VY + VH} L${SX + SW},${SY}" pathLength="1" class="zoomline draw" style="--dl:.55s"/>`;
  // the 16-byte AES block that gets garbled: attributes + xfam
  const block = `<rect x="${TX}" y="${SY}" width="${16 * BY}" height="${RH}" class="blk"/>`;

  return `
<svg viewBox="0 0 1000 540" class="seq tdcs" text-anchor="middle">
  <text x="500" y="30" class="colh">TD Control Structure · encrypted with the TD’s key</text>
  <!-- the table starts centred and slides down to make room for the zoom -->
  <g class="tbl"><g data-from="0">${table}</g>
  ${at(0, 0, `<rect x="${TX}" y="${SY}" width="${8 * BY}" height="${RH}" class="attrpulse late" style="--late:.9s"/>`)}</g>
  ${at(1, null, zoom)}
  ${at(1, null, `<g class="grow" ${grow}>${frame}${marks}</g>${labels}<g class="prodvals">${vals}</g>${dbg('ok late" style="--late:2.45s')}`)}
  ${fly(2, TX + 8 * BY, SY + RH / 2, TX + 8 * BY, 530, 'wrong key')}
  ${at(2, null, `<g class="late" style="--late:1.2s">${block}</g>
    <text x="${TX}" y="${TY + 4 * RH + 44}" text-anchor="start" class="blknote late" style="--late:1.5s">one AES block = 16 bytes garbled: attributes + xfam</text>`)}
  ${at(2, 2, `<g class="late" style="--late:1.25s">${flick2}</g>`)}
  ${at(3, null, settle)}
  ${at(3, null, `${dbg('bad late" style="--late:1.9s')}
    <g class="late" style="--late:2.3s"><rect x="270" y="232" width="420" height="42" rx="12" class="dbgtag"/>
    <text x="480" y="261" class="dbgtagt">debug = 1 → host can read the TD</text></g>`)}
</svg>`;
})();

// ---- BadRAM: the SPD lie and the ghost-bit alias (after the badram.eu figure) ----
const BADRAM_SVG = `
<svg viewBox="0 0 1000 540" class="seq badram" text-anchor="middle">
  <!-- CPU and DIMM icons; the DIMM reports its size to the CPU -->
  <g class="ico">
    <rect x="186" y="34" width="104" height="104" rx="6" class="ico-o"/>
    <rect x="206" y="54" width="64" height="64" rx="3" class="ico-i"/>
    <path d="M222,68 h32 l6,6 v24 l-6,6 h-32 l-6,-6 v-24 z" class="ico-i"/>
    <circle cx="198" cy="46" r="4"/><circle cx="278" cy="46" r="4"/><circle cx="198" cy="126" r="4"/><circle cx="278" cy="126" r="4"/>
    <rect x="660" y="64" width="220" height="52" rx="5" class="ico-o"/>
    <path d="M672,128 H868" class="ico-o"/>
    <path d="M690,64 l14,14 M712,64 l14,14 M790,64 l-14,14 M836,64 l14,14 M858,64 l-14,14 M740,78 h40" class="ico-i"/>
  </g>
  <text x="238" y="186" class="lbl">CPU</text><text x="770" y="186" class="lbl">DRAM</text>
  <path d="M650,92 H318" class="spdarr"/><polygon points="304,92 324,82 324,102" class="spdhd"/>
  <text x="484" y="76" class="gb">16 GB</text>
  ${at(1, null, '<path d="M436,66 H532" class="strike"/><text x="484" y="136" class="gb lie late" style="--late:.9s">32 GB</text>')}
  ${at(1, null, `<g class="hat"><image href="assets/badram/hat.svg" x="680" y="-12" width="180" height="76"/></g>
    <path d="M944,38 l-46,30 h22 l-34,30 l58,-36 h-22 z" class="bolt late" style="--late:.6s"/>`)}

  <!-- address columns: the CPU's view (left) and the real DRAM cells (right) -->
  <rect x="140" y="210" width="196" height="150" class="col"/>
  <rect x="680" y="210" width="180" height="150" class="col"/>
  <rect x="128" y="228" width="220" height="72" rx="12" class="prot"/><rect x="140" y="250" width="196" height="28" class="row"/>
  <rect x="668" y="228" width="204" height="72" rx="12" class="prot"/><rect x="680" y="250" width="180" height="28" class="row"/>
  <text x="238" y="330" class="small">protected VM</text><text x="770" y="330" class="small">protected VM</text>

  <!-- access control guards the real address -->
  <path d="M348,264 H430" class="guard"/><polygon points="446,264 426,254 426,274" class="guardhd"/>
  <path d="M480,226 l34,8 v28 c0,22 -16,34 -34,46 c-18,-12 -34,-24 -34,-46 v-28 z" class="shield"/>
  <rect x="467" y="256" width="26" height="20" rx="3" class="lockb"/><path d="M472,256 v-8 a8,8 0 0 1 16,0 v8" class="lockh"/>
  <g class="loop knock" data-at="0"><circle cx="352" cy="264" r="9"/></g>

  <!-- the lie: the CPU's address space doubles, the new half wraps onto the same DRAM -->
  ${at(1, null, `<g class="grow"><rect x="140" y="360" width="196" height="150" class="col ghost"/>
    <text x="238" y="478" class="ghostl">ghost half</text><text x="238" y="500" class="ghostl sm">no DRAM of its own</text></g>
    <path d="M336,360 L680,210 M336,510 L680,360" class="wrap late" style="--late:1s"/>`)}

  <!-- the alias: same offset in the ghost half -->
  ${at(2, null, '<rect x="140" y="400" width="196" height="28" class="row alias"/><text x="70" y="422" class="aliasl">alias</text>')}

  <!-- the bypass: the ghost alias reaches the protected cell without passing the check -->
  ${at(3, null, `<path d="M336,414 C470,414 520,264 664,264" class="bypass draw" pathLength="1"/>
    <path d="M336,414 C470,414 520,264 664,264" class="bypass flowing late" style="--late:.9s"/>
    <polygon points="680,264 660,254 660,274" class="bypasshd late" style="--late:.7s"/>
    <path d="M550,430 l20,20 l40,-44" class="check late" style="--late:.9s"/>`)}
</svg>`;

// ---- DDRop: injecting a malicious secure page table in TDX ----
// One physical memory column with two pages: the attacker page is relocated
// up (leaving a stale copy behind), then the stale spot becomes a new secure
// page table whose zero-init write is dropped, so the fake entry survives.
const SEPT_SVG = (() => {
  const X = 192, W = 236, CX = X + W / 2, H = 34;
  const top = [96, 136, 176, 216], tgt = [306, 346, 386, 426];
  const vals = ['attacker data', 'HPA_VICTIM', 'attacker data', 'attacker data'];
  const line = (y, v, cls, extra = '') =>
    `<rect x="${X}" y="${y}" width="${W}" height="${H}" rx="5" class="ln ${cls}${v === 'HPA_VICTIM' ? ' key' : ''}"${extra}/>` +
    `<text x="${CX}" y="${y + 25}" class="ev ${cls}${v === 'HPA_VICTIM' ? ' key' : ''}"${extra}>${v}</text>`;
  const late = (d) => ` style="--late:${d}s"`;
  let w = '';
  [0, 1, 2, 3].forEach(i => {
    const y = tgt[i];
    // write packets from the TDX module; line 1 is dropped at the interposer
    w += i === 1
      ? `<g class="wpkt drop" data-at="2" style="--dl:${0.2 + i * 0.25}s"><rect x="566" y="${y + 1}" width="96" height="32" rx="7"/><text x="614" y="${y + 24}">INIT</text></g>`
      : `<g class="wpkt" data-at="2" style="--dl:${0.2 + i * 0.25}s"><rect x="444" y="${y + 1}" width="96" height="32" rx="7"/><text x="492" y="${y + 24}">INIT</text></g>`;
  });
  return `
<svg viewBox="0 0 1000 560" class="seq sept" text-anchor="middle">
  <defs><pattern id="sept-hatch" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
    <rect width="12" height="12" fill="#fdf1f1"/><line x1="0" y1="0" x2="0" y2="12" stroke="#f0bcbc" stroke-width="5"/></pattern></defs>
  <text x="310" y="46" class="colh">Physical memory</text>
  <rect x="170" y="62" width="280" height="422" rx="14" class="mem"/>
  <rect x="182" y="86" width="256" height="174" rx="9" class="page"/>
  <rect x="182" y="296" width="256" height="174" rx="9" class="page"/>
  <text x="80" y="167" class="side">new</text><text x="80" y="193" class="side">address</text>
  <text x="80" y="377" class="side">target</text><text x="80" y="403" class="side">address</text>

  <rect x="500" y="62" width="60" height="422" rx="10" class="izone"/><text x="530" y="50" class="small acc">interposer</text>
  ${at(2, 2, '<rect x="500" y="62" width="60" height="422" rx="10" class="izone hot"/>')}

  <!-- step 0: the attacker's own page, crafted to look like a page-table entry -->
  ${at(0, 0, tgt.map((y, i) => line(y, vals[i], 'fresh late', late(0.2 + i * 0.2))).join(''))}

  <!-- step 1+: relocation copies the page up; the old copy stays behind -->
  ${at(1, null, `<g class="reloc">${top.map((y, i) => line(y, vals[i], 'fresh')).join('')}</g>`)}
  ${at(1, 1, `<path d="M182,${tgt[1] + 17} H150 V${top[1] + 17} H172" class="relarr draw" pathLength="1"/>
    <polygon points="182,${top[1] + 17} 168,${top[1] + 9} 168,${top[1] + 25}" class="relhd late" style="--late:.7s"/>
    <path d="M450,${tgt[1] + 17} H600" class="lead late" style="--late:1.4s"/>
    <text x="612" y="${tgt[1] + 10}" text-anchor="start" class="note late" style="--late:1.4s">stale copy</text>
    <text x="612" y="${tgt[1] + 38}" text-anchor="start" class="note late" style="--late:1.4s">left behind</text>`)}
  ${at(1, 1, tgt.map((y, i) => line(y, vals[i], 'stale')).join(''))}

  <!-- step 2+: the TDX module zeroes the new table; three writes land, one is dropped -->
  ${at(2, null, [0, 2, 3].map(i => line(tgt[i], vals[i], 'stale vanish', late(1.25 + i * 0.25))).join('') +
    [0, 2, 3].map(i => line(tgt[i], 'SEPTE_INIT', 'init late', late(1.25 + i * 0.25))).join('') +
    line(tgt[1], vals[1], 'survive'))}
  <!-- from SEPT.ADD on, the target page belongs to the TDX module as a secure page table -->
  ${at(2, null, `<g class="septown late" style="--late:.2s"><rect x="182" y="296" width="256" height="174" rx="9" class="septpage"/>
    <rect x="192" y="264" width="236" height="34" rx="9" class="septtab"/>
    <rect x="206" y="280" width="16" height="13" rx="2" class="septlock"/><path d="M209,280 v-5 a5,5 0 0 1 10,0 v5" class="septlockh"/>
    <text x="324" y="288" class="septt">secure page table</text></g>`)}
  ${at(2, 2, `<rect x="690" y="290" width="260" height="180" rx="14" class="dev"/>
    <text x="820" y="340" class="devl">TDX module</text>
    <text x="820" y="378" class="small">zero-init a new</text><text x="820" y="404" class="small">secure page table</text>
    <path d="M512,${tgt[1] - 2} l36,36 M548,${tgt[1] - 2} l-36,36" class="cut late" style="--late:1.2s"/>`)}
  ${w}

  <!-- step 3: the surviving entry maps the attacker's guest address onto victim memory -->
  ${at(3, null, `<path d="M440,${tgt[1] + 17} H676" class="map inj"/><polygon points="690,${tgt[1] + 17} 672,${tgt[1] + 8} 672,${tgt[1] + 26}" class="injhd"/>
    <text x="600" y="${tgt[1] - 4}" class="note bad">mapped!</text>
    <rect x="690" y="${tgt[1] - 14}" width="260" height="62" rx="10" class="vicbox"/><text x="820" y="${tgt[1] + 25}" class="ev bad">victim TD page</text>`)}

  <!-- the command issued at each step -->
  ${at(0, 0, '<text x="310" y="540" class="cmd">attacker TD writes its page</text>')}
  ${at(1, 1, '<text x="310" y="540" class="cmd">TDH.MEM.PAGE.RELOCATE</text>')}
  ${at(2, 2, '<text x="310" y="540" class="cmd">TDH.MEM.SEPT.ADD</text>')}
  ${at(3, null, '<text x="310" y="540" class="cmd">TDH.MEM.SEPT.RD</text>')}
</svg>`;
})();

const PAPERS = [
  {
    id: 'badram',
    name: 'BadRAM',
    accent: '#a11d21',
    logo: 'assets/badram/logo-accent.svg',  // the logo recoloured in the paper accent
    logoOn: 'assets/badram/logo-on.svg',     // white version for the active bottom-bar chip (keeps the face details)
    title: 'Practical Memory Aliasing Attacks on Trusted Execution Environments',
    venue: 'IEEE S&P 2025',
    url: 'badram.eu',
    pdf: 'https://badram.eu/badram.pdf',
    code: 'https://github.com/badramattack/badram',
    hook: 'A $10 rogue memory module',
    authors: 'J. De Meulemeester*, L. Wilke*, D. Oswald, T. Eisenbarth, I. Verbauwhede, J. Van Bulck',
    authorNote: '* equal contribution',
    orgs: ['cosic', 'distrinet', 'luebeck', 'birmingham'],
    panels: [
      {
        id: 'badram-cover',
        kind: 'cover',
        grid: [0, 0, 2, 2],
        title: 'Rogue memory that lies to the CPU',
        image: 'assets/badram/ddr5setup.jpg',
        annotations: [
          { at: [62, 22], label: [4, 4], text: 'Raspberry Pi Pico' },
          { at: [41.5, 58], label: [4, 35], text: 'SPD chip: tells the CPU the DIMM size' },
        ],
        facts: [
          { big: '<$10', small: 'off-the-shelf hardware' },
          { big: 'DDR4 + DDR5', small: 'commodity DIMMs' },
          { big: 'SEV-SNP', small: 'attestation broken' },
        ],
        badges: [{ award: 'Intel Hardware Security Award 2026 finalist' }, 'CVE-2024-21944', 'Ars Technica, The Register, The Record'],
        hold: 11000,
      },
      {
        id: 'badram-steps',
        kind: 'svgsteps',
        grid: [0, 2, 1, 1],
        title: 'The SPD lie creates ghost aliases',
        svg: BADRAM_SVG,
        thumb: 3,
        demo: 'assets/badram/demo.mp4',
        demoTitle: 'Proof of concept: capturing and replaying SEV-SNP VM ciphertext',
        // timeline next to the video: [seconds, a few words]
        demoSteps: [
          [0, 'Find the alias of the victim’s buffer'],
          [5, 'Capture the victim’s ciphertext'],
          [12, 'Victim overwrites its buffer with 0xff'],
          [16, 'Replay the old ciphertext'],
          [19, 'Victim reads its old zeros back'],
        ],
        frames: [
          { head: 'Normal operation', text: 'The memory module reports its true size. Access control stops the hypervisor from touching the protected VM’s memory.' },
          { head: '① Lie about the size', text: 'The rogue module claims double its real size. The CPU now sees a ghost half with no DRAM of its own: it wraps onto the same chips.' },
          { head: '② Ghost alias', text: 'Each ghost address is an alias of a real one: one extra address bit, same DRAM cell.' },
          { head: '③ Bypass access control', text: 'Only the real address is guarded. Through the ghost alias, the hypervisor reads and writes protected memory, e.g., to capture and replay ciphertext.' },
        ],
        hold: 4800,
      },
      {
        id: 'badram-attest',
        kind: 'svgsteps',
        grid: [1, 2, 1, 1],
        title: 'Forging SEV-SNP attestation',
        svg: ATTEST_SVG,
        thumb: 7,
        frames: [
          { head: 'Normal launch', text: 'The owner asks the cloud to run image A. The Secure Processor measures it and keeps the digest hash(A) in DRAM. Attestation proves A is running.', hold: 7000 },
          { head: '① Offline: genuine launch', text: 'The hypervisor launches the genuine image A; the digest hash(A) is stored encrypted in DRAM.' },
          { head: '② Offline: capture', text: 'Through the BadRAM alias, the hypervisor copies the encrypted digest.' },
          { head: '③ Online: owner request', text: 'The owner asks the cloud to run image A.' },
          { head: '④ Swap in a backdoor', text: 'The hypervisor launches a backdoored image B instead…' },
          { head: '④ Swap in a backdoor', text: '…so the Secure Processor measures hash(B).' },
          { head: '⑤ Replay', text: 'The hypervisor replays the old encrypted hash(A) into the digest through the alias.' },
          { head: '⑥ Attestation passes', text: 'The owner receives a valid report for image A, while the VM runs the backdoor.' },
        ],
        hold: 3800,
      },
      {
        id: 'badram-impact',
        kind: 'table',
        grid: [0, 3, 1, 1],
        title: 'Impact across TEEs',
        rows: [
          { name: 'AMD SEV-SNP', status: 'bad', verdict: 'Affected', text: 'Ciphertext replay, page remapping, forged attestation' },
          { name: 'Intel classic SGX', status: 'warn', verdict: 'Leakage', text: 'Fine-grained, noiseless write-pattern leakage' },
          { name: 'Intel Scalable SGX / TDX', status: 'ok', verdict: 'Not affected', text: 'Dedicated boot-time alias checks… for now' },
        ],
        note: 'Disclosed to AMD (CVE-2024-21944, AMD-SB-3015) → firmware update validates memory configuration at boot.',
        hold: 13000,
      },
      {
        id: 'badram-ddr3',
        kind: 'figure',
        grid: [1, 3, 1, 1],
        title: 'Works on old memory too',
        image: 'assets/badram/ddr3setup.jpg',
        annotations: [
          { at: [65, 30], label: [24, 8], text: 'Raspberry Pi drives the SPD' },
          { at: [20, 74.3], label: [4, 50], text: 'DDR3 module' },
        ],
        bullets: [
          'DDR3 DIMM with its SPD chip removed and emulated by a Raspberry Pi',
          'Some DIMMs leave the SPD unlocked: a software-only attack is possible',
          'A malicious BIOS can create the same aliases',
        ],
        hold: 11000,
      },
    ],
  },
  {
    id: 'battering',
    name: 'Battering RAM',
    accent: '#2e6b68',
    logo: 'assets/battering/logo-accent.svg',  // the logo recoloured in the paper accent
    title: 'Low-Cost Interposer Attacks on Confidential Computing via Dynamic Memory Aliasing',
    venue: 'IEEE S&P 2026',
    url: 'batteringram.eu',
    pdf: 'https://batteringram.eu/batteringram.pdf',
    code: 'https://github.com/batteringramattack/batteringram',
    hook: 'Bypassing boot-time alias checks',
    authors: 'J. De Meulemeester, D. Oswald, I. Verbauwhede, J. Van Bulck',
    orgs: ['cosic', 'distrinet', 'birmingham', 'durham'],
    panels: [
      {
        id: 'battering-cover',
        kind: 'cover',
        grid: [0, 0, 1, 1],
        title: 'Two-faced DRAM',
        image: 'assets/battering/ddr4-interposer.jpg',
        annotations: [
          { at: [12, 45], label: [16, 4], text: 'Raspberry Pi Pico' },
          { at: [50, 87], label: [5, 80], text: 'analog switches' },
        ],
        facts: [
          { big: '<$50', small: 'vs. >$100,000 commercial interposers' },
          { big: 'Scalable SGX', small: 'arbitrary plaintext read/write' },
          { big: 'SEV-SNP', small: 'attestation broken again, fully patched' },
        ],
        badges: [{ award: 'Pwnie Award 2026:<br>Best Server-Side/Cloud Bug' }, 'Black Hat EU 2025', 'Open-source hardware'],
        hold: 10000,
      },
      {
        id: 'battering-how',
        kind: 'svgsteps',
        grid: [1, 0, 1, 1],
        title: 'Dynamic aliasing with a switch',
        svg: ALIAS_SVG('single'),
        thumb: 2,
        frames: [
          { head: 'During boot', text: 'The interposer passes every line straight through. Boot-time alias checks see a perfectly normal DIMM.' },
          { head: '① Flip the switch', text: 'After boot, the microcontroller flips an analog switch: A13 on the DIMM side is pulled to 0.' },
          { head: '② A dynamic alias', text: 'CPU addresses that differ only in A13 now land in the same DRAM row, invisible to the OS and firmware.' },
        ],
        // click-only variants (Figure 5 of the paper); the auto tour always shows the first
        variants: [
          { label: '1 switch' },
          { label: 'Redirect', svg: ALIAS_SVG('redirect'), frames: [
            { head: 'During boot', text: 'The interposer passes every line straight through. Boot-time alias checks see a perfectly normal DIMM.' },
            { head: '① Flip and redirect', text: 'Registered DIMMs check command parity, so a single grounded line gets caught. Instead, the CPU’s A13 is rerouted to A17: parity still matches.' },
            { head: '② A dynamic alias', text: 'This DIMM ignores A17, so addresses that differ only in A13 share a DRAM row. Works on our AMD system; Intel disables A17 in the RCD.' },
          ] },
          { label: '2 switches', svg: ALIAS_SVG('dual'), frames: [
            { head: 'During boot', text: 'The interposer passes every line straight through. Boot-time alias checks see a perfectly normal DIMM.' },
            { head: '① Flip both switches', text: 'A13 and A11 are pulled to 0 together. When both bits are equal, the two changes cancel out in the command parity.' },
            { head: '② A dynamic alias', text: 'Addresses with A13 = A11 = 1 alias those where both are 0; the attacker avoids pages with only one set. The most general variant, used in the paper.' },
          ] },
        ],
        hold: 4500,
      },
      {
        id: 'battering-sgx',
        kind: 'svgsteps',
        grid: [0, 1, 2, 2],
        title: 'Plaintext access to SGX enclaves',
        label: 'Scalable SGX',
        svg: SGX_SVG,
        thumb: 6,
        demo: 'assets/battering/demo.mp4',
        demoTitle: 'Proof of concept: capturing ciphertext of Intel’s provisioning enclave (Scalable SGX)',
        demoSteps: [
          [1, 'Launch the attack'],
          [5, 'Interrupt the victim enclave (PCE)'],
          [11, 'Capture its ciphertext'],
          [19, 'Start attacker enclave 2 at the victim’s address'],
          [21.5, 'Replay: the PCE’s memory in plaintext'],
          [22.5, 'Provisioning key extracted'],
        ],
        frames: [
          { head: 'Victim enclave', text: 'The CPU encrypts the victim’s secret on its way to DRAM. Scalable SGX uses one key, tweaked only by the physical address.' },
          { head: '① Allocate an aliasing buffer', text: 'The attacker sets up its own enclave at an address that will alias the victim’s secret.' },
          { head: '② Enable the interposer', text: 'The switch flips: the attacker’s addresses now land on the victim’s DRAM.' },
          { head: '③ Capture the ciphertext', text: 'Reading through the alias decrypts under the wrong address: gibberish, but the attacker saves it.' },
          { head: '④ Swap in attacker enclave 2', text: 'Interposer off, victim gone. A second attacker enclave is allocated at the victim’s own address.' },
          { head: '⑤ Replay', text: 'Writing the gibberish back through the alias re-encrypts it under the same address: the victim’s exact ciphertext.' },
          { head: '⑥ Read plaintext', text: 'Enclave 2 reads its own memory, decrypted with the right address: the victim’s secret. Arbitrary read and write.' },
        ],
        hold: 4200,
        extra: {
          label: 'Also: SEV-SNP attestation',
          title: 'Breaking SEV-SNP attestation, again',
          svg: SEV_SVG,
          thumb: 9,
          frames: [
            { head: 'Fully patched SEV-SNP', text: 'AMD’s BadRAM fix checks for aliases at boot. Our interposer is transparent then.' },
            { head: '① Install the interposer', text: 'Place the interposer between CPU and memory. It passes everything through.' },
            { head: '② Launch genuine image A', text: 'The image is encrypted with the VM’s own key on its way to DRAM…' },
            { head: '② Launch genuine image A', text: '…and the AMD Secure Processor measures it into the launch digest: hash(A).' },
            { head: '③ Allocate an aliasing buffer', text: 'The hypervisor sets up its own buffer at an address that will alias the launch digest.' },
            { head: '③ Enable the interposer', text: 'Now the alias appears, long after the boot-time checks.' },
            { head: '③ Capture the ciphertext', text: 'Reading through the alias copies the encrypted hash(A) into the hypervisor’s buffer.' },
            { head: '④ Launch backdoored image B', text: 'The Secure Processor now measures hash(B).', hold: 6000 },
            { head: '⑤ Replay the ciphertext', text: 'Writing the saved bytes back through the alias restores the encrypted hash(A).' },
            { head: '⑤ Forged attestation', text: 'The Secure Processor reports hash(A): the backdoored VM attests as genuine.' },
          ],
        },
      },
      {
        id: 'battering-setup',
        kind: 'figure',
        grid: [0, 3, 1, 1],
        title: 'Installed in a server',
        image: 'assets/battering/setup-sevsnp.jpg',
        annotations: [
          { at: [24, 35], label: [2, 4], text: 'microcontroller' },
          { at: [58, 58], label: [52, 84], text: 'interposer' },
          { at: [62, 43], label: [52, 18], text: 'unmodified DIMM' },
        ],
        bullets: [
          'Standard 4-layer PCB, fabricated by any PCB house',
          'Schematics, board files and firmware are open source',
          'AMD and Intel acknowledged: a fix needs a redesign of memory encryption',
        ],
        hold: 10500,
      },
      {
        id: 'battering-impact',
        kind: 'table',
        grid: [1, 3, 1, 1],
        title: 'Impact across TEEs',
        rows: [
          { name: 'Intel Scalable SGX', status: 'bad', verdict: 'Affected', text: 'Arbitrary plaintext read/write; provisioning key extracted' },
          { name: 'AMD SEV-SNP (patched)', status: 'bad', verdict: 'Affected', text: 'Boot-time alias checks bypassed; attestation forged' },
          { name: 'Intel client SGX', status: 'warn', verdict: 'Leakage', text: 'Ciphertext read only; Merkle tree gives freshness' },
          { name: 'Intel TDX', status: 'na', verdict: 'Out of reach', text: 'DDR5-only platforms; a DDR4 interposer does not fit → DDRop' },
        ],
        note: 'Disclosed to Intel and AMD (Intel announcement, AMD-SB-3024): physical attacks out of scope.<br>Defending against Battering RAM requires cryptographic freshness in memory encryption.',
        hold: 14000,
      },
    ],
  },
  {
    id: 'ddrop',
    name: 'DDRop',
    accent: '#3a3f95',
    logo: 'assets/ddrop/logo-accent.svg',  // the logo recoloured in the paper accent
    title: 'Active Memory Interposer Attacks on Confidential VMs by Dropping DDR5 Writes',
    venue: 'ACM CCS 2026',
    url: 'ddropattack.eu',
    pdf: 'https://ddropattack.eu/ddrop.pdf',
    code: 'https://github.com/ddropattack/ddrop',
    hook: 'Silently dropping DDR5 writes',
    authors: 'J. De Meulemeester, S. Gloor, P. Jattke, D. Moghimi, D. Oswald, M. Thompson, K. Razavi, I. Verbauwhede, J. Van Bulck',
    orgs: ['cosic', 'distrinet', 'eth', 'google', 'durham'],
    panels: [
      {
        id: 'ddrop-cover',
        kind: 'cover',
        layout: 'stack',
        grid: [0, 0, 2, 2],
        title: 'First low-cost active DDR5 interposer',
        image: 'assets/ddrop/interposer-front.jpg',
        annotations: [
          { at: [40, 80], label: [4, 52], text: 'analog switches' },
          { at: [72, 25], label: [56, 0], text: 'unmodified DDR5 DIMM' },
        ],
        facts: [
          { big: '$159', small: 'complete interposer system' },
          { big: 'Native speed', small: 'no bus downclocking' },
          { big: 'Intel TDX', small: 'debug mode + forged attestation' },
        ],
        badges: ['KU Leuven · ETH Zurich · Durham · Google', 'Disclosed to Intel & AMD', 'Open-source hardware'],
        hold: 10000,
      },
      {
        id: 'ddrop-parity',
        kind: 'svgsteps',
        grid: [0, 2, 1, 1],
        title: 'No freshness? Just drop the write',
        svg: PARITY_SVG,
        thumb: 2,
        frames: [
          { head: 'Encrypted ≠ fresh', text: 'TEEs encrypt memory but cannot tell if it is current. Every write passes through the RCD buffer on the DIMM.' },
          { head: '① Inject a parity error', text: 'The interposer corrupts the command on the fly. The RCD detects a parity error and discards the write…' },
          { head: '② Suppress the alert', text: '…and the interposer cuts the ALERT line. The CPU believes the write succeeded, but the old data simply stays in memory.' },
          { head: '③ Read back stale data', text: 'A later read returns the old value as if it were the latest write. Replay with no cryptographic detection.' },
        ],
        hold: 5800,
      },
      {
        id: 'ddrop-sept',
        kind: 'svgsteps',
        grid: [1, 2, 1, 1],
        title: 'Injecting a malicious TDX page table',
        svg: SEPT_SVG,
        thumb: 2,
        frames: [
          { head: 'Craft a fake entry', text: 'The attacker’s own TD (a TDX confidential VM) fills a page with data that looks like a page-table entry pointing at victim memory (HPA_VICTIM).' },
          { head: '① Relocate the page', text: 'TDX moves the page to a new physical address, but never clears the old one: a valid encrypted copy stays behind.' },
          { head: '② Drop the zero-init', text: 'The old address becomes a new secure page table, which the TDX module zeroes. DDRop drops one write, so the fake entry survives.', hold: 6000 },
          { head: '③ Malicious mapping', text: 'TDX now trusts the fake entry: the attacker’s guest address maps straight onto victim memory. 100% deterministic.' },
        ],
        hold: 4800,
      },
      {
        id: 'ddrop-debug',
        kind: 'svgsteps',
        grid: [0, 3, 1, 1],
        title: 'Forcing a victim TD into debug mode',
        svg: TDCS_SVG,
        thumb: 3,
        demo: 'assets/ddrop/tdcs-poc.mp4',
        demoTitle: 'Proof of concept: forcing a TDX Trust Domain into debug mode',
        demoSteps: [
          [0, 'Launch the attack'],
          [12, 'Craft a fake page-table entry'],
          [25.5, 'Relocate the page, leaving a copy'],
          [34.5, 'Drop the zero-init write'],
          [39, 'Victim’s TDCS mapped into the attacker TD'],
          [57, 'Suspend the victim, overwrite its attributes'],
          [71.5, 'Debug mode on: dump the victim’s memory'],
          [84, 'Restore and resume the victim'],
        ],
        frames: [
          { head: 'Production TD', text: 'The victim’s configuration lives in its encrypted TD Control Structure. One 64-bit field, <b>attributes</b>, holds the debug bit.' },
          { head: 'Zoom in: the attribute bits', text: 'Each bit toggles a TD feature. Bit 0 is <b>debug</b>: when set, the host may inspect and modify the TD’s memory.', hold: 6000 },
          { head: '① Corrupt the field', text: 'Through the injected page tables, DDRop overwrites the field with ciphertext under another key. It decrypts to random bits: the whole 16-byte AES block is garbled.', hold: 6000 },
          { head: '② Coin flip: debug = 1', text: '…and roughly half the time, debug lands on 1. The host can now dump the victim’s memory and restore it unnoticed.' },
        ],
        hold: 4500,
      },
      {
        id: 'ddrop-impact',
        kind: 'table',
        grid: [1, 3, 1, 1],
        title: 'Impact across TEEs',
        rows: [
          { name: 'Intel TDX', status: 'bad', verdict: 'Affected', text: 'Ciphertext access, debug mode, forged attestation' },
          { name: 'AMD SEV-SNP', status: 'bad', verdict: 'Affected', text: 'Dropped writes and page relocations' },
          { name: 'Intel Scalable SGX', status: 'bad', verdict: 'Affected', text: 'Dropped writes break integrity' },
          { name: 'Intel client SGX', status: 'ok', verdict: 'Not affected', text: 'Merkle tree provides freshness' },
        ],
        note: 'Disclosed to Intel and AMD (Intel 2026-09-14-001, AMD-SB-3048): physical attacks out of scope.<br>Software hardening and timing-based detection help, but robust defence needs cryptographic freshness.',
        hold: 14000,
      },
    ],
  },
];
