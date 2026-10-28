(() => {
  'use strict';

  // ---------- tunables ----------
  const IDLE_MS = 60000;          // kiosk: manual mode falls back to the auto tour after this
  const HINT_MS = 8000;           // navigation hints fade out after this
  const OVERVIEW_HOLD = 12000;
  const ISLAND_HOLD = 5000;
  const TRANSITION_HOLD = 9000;
  const LAST_FRAME_BONUS = 1.6;   // linger a bit longer on the final frame of a flipbook
  // every step stays up at least long enough to read its caption: time to look + reading speed
  const LOOK_MS = 3000, WORDS_PER_S = 3.5;
  const readMs = f => LOOK_MS + `${f.head} ${f.text}`.replace(/<[^>]+>/g, '').split(/\s+/).filter(Boolean).length / WORDS_PER_S * 1000;

  // ---------- world geometry (world px; a 1x1 panel is ~1:1 on a 1080p screen) ----------
  const PW = 1600, PH = 900, GAP = 90, ROWS = 4;
  const ISL_PAD = 150, HEAD_H = 1450;
  const ISL_GAP = 1700, MARGIN = 450, TITLE_H = 1700, ORGS_H = 420;
  const ISL_W = 2 * PW + GAP + 2 * ISL_PAD;
  const ISL_H = HEAD_H + ROWS * PH + (ROWS - 1) * GAP + ORGS_H + 2 * ISL_PAD;
  const WORLD_W = 2 * MARGIN + PAPERS.length * ISL_W + (PAPERS.length - 1) * ISL_GAP;
  const WORLD_H = TITLE_H + ISL_H + 350;

  const viewport = document.getElementById('viewport');
  const world = document.getElementById('world');
  const track = document.getElementById('track');
  const statusBtn = document.getElementById('status');
  const chipsNav = document.getElementById('chips');
  const params = new URLSearchParams(location.search);
  // ?kiosk: demo stand (no hints, hidden cursor, the tour resumes by itself after IDLE_MS)
  const KIOSK = params.has('kiosk');
  document.body.classList.toggle('kiosk', KIOSK);

  const el = (tag, cls, html) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  };
  const setAccent = (e, hex) => {
    const n = parseInt(hex.slice(1), 16), rgb = [n >> 16, (n >> 8) & 255, n & 255].join(',');
    e.style.setProperty('--accent', hex);
    e.style.setProperty('--accent-rgb', rgb);
  };
  const TROPHY = '<svg class="trophy" viewBox="0 0 24 24"><path d="M7 3h10v2h3v3a4 4 0 0 1-4 4h-.3A5 5 0 0 1 13 14.9V18h3v3H8v-3h3v-3.1A5 5 0 0 1 8.3 12H8a4 4 0 0 1-4-4V5h3V3zm0 4H6v1a2 2 0 0 0 1 1.7V7zm10 0v2.7A2 2 0 0 0 18 8V7h-1z"/></svg>';
  const PLAY = '<svg class="play" viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z"/></svg>';
  // island header links: small line icons in the paper accent
  const ICON = {
    site: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z"/>',
    paper: '<path d="M6 3h8l5 5v13H6z"/><path d="M14 3v5h5M9 13h7M9 17h7"/>',
    code: '<path d="M8 7l-5 5 5 5M16 7l5 5-5 5"/>',
  };
  const link = (href, text, icon) => href ? `<a href="${href}" target="_blank" rel="noopener">` +
    `<svg viewBox="0 0 24 24">${ICON[icon]}</svg>${text}</a>` : '';
  const place = (e, r) => Object.assign(e.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' });

  world.style.width = WORLD_W + 'px';
  world.style.height = WORLD_H + 'px';

  // ---------- overview title ----------
  const title = el('div', 'talk-title',
    `<h1>${TALK.title}</h1><p class="sub">${TALK.subtitle}</p>`);
  place(title, { x: MARGIN, y: 120, w: WORLD_W - 2 * MARGIN, h: TITLE_H - 200 });
  world.append(title);

  // ---------- islands, panels, transitions; collect tour stops ----------
  const stops = [{ kind: 'overview', rect: { x: 0, y: 0, w: WORLD_W, h: WORLD_H }, pad: 1, hold: OVERVIEW_HOLD }];
  const islands = {};  // paper id -> {el, stop index}

  PAPERS.forEach((paper, i) => {
    const ix = MARGIN + i * (ISL_W + ISL_GAP), iy = TITLE_H;

    // the transition into this paper comes first, so it belongs to this paper's timeline
    const tr = TRANSITIONS.find(t => t.to === paper.id);
    if (tr) {
      const prev = PAPERS.find(p => p.id === tr.from);
      const t = el('div', 'transition',
        `<svg viewBox="0 0 1000 300" preserveAspectRatio="none">
           <defs><linearGradient id="g-${tr.from}" x1="0" x2="1">
             <stop offset="0" stop-color="${prev.accent}"/><stop offset="1" stop-color="${paper.accent}"/></linearGradient></defs>
           <path d="M30 150 H840" stroke="url(#g-${tr.from})" stroke-width="56" stroke-linecap="round"/>
           <path d="M780 30 L990 150 L780 270 Z" fill="${paper.accent}"/>
         </svg><h3>${tr.head}</h3><p>${tr.body}</p>`);
      const r = { x: ix - ISL_GAP + 90, y: iy + 260, w: ISL_GAP - 180, h: 2600 };
      place(t, r);
      world.append(t);
      // zoom out to show the paper we come from and the one we go to
      stops.push({ kind: 'transition', paper, rect: { x: ix - ISL_GAP - ISL_W, y: iy, w: 2 * ISL_W + ISL_GAP, h: ISL_H }, pad: 1.03, hold: TRANSITION_HOLD });
      t.dataset.stop = stops.length - 1;
    }

    const isl = el('div', 'island');
    setAccent(isl, paper.accent);
    place(isl, { x: ix, y: iy, w: ISL_W, h: ISL_H });
    const head = el('div', 'island-head',
      `<img src="${paper.logo}" alt="">` +
      `<div><div class="name">${paper.name}</div>` +
      `<div class="hook">${paper.hook}</div>` +
      `<div class="meta"><span class="venue">${paper.venue}</span>${link('https://' + paper.url, paper.url, 'site')}` +
      `${link(paper.pdf, 'Paper', 'paper')}${link(paper.code, 'Code', 'code')}</div>` +
      `<div class="authors">${paper.authors.split(', ').map(a => `<span>${a.replace('*', '<sup>*</sup>')}</span>`).join(', ')}` +
      `${paper.authorNote ? `<span class="anote">${paper.authorNote}</span>` : ''}</div></div>`);
    setAccent(head, paper.accent);
    place(head, { x: ix + ISL_PAD, y: iy + ISL_PAD, w: ISL_W - 2 * ISL_PAD, h: HEAD_H - 120 });
    // this paper's co-author institutions, along the bottom of the island
    const orgs = el('div', 'orgs', paper.orgs.map(id => ORGS[id])
      .map(o => `<img src="${o.logo}" alt="${o.name}" title="${o.name}" style="height:${o.h}px">`).join(''));
    place(orgs, { x: ix + ISL_PAD, y: iy + ISL_H - ISL_PAD - ORGS_H, w: ISL_W - 2 * ISL_PAD, h: ORGS_H });
    world.append(isl, head, orgs);

    stops.push({ kind: 'island', paper, rect: { x: ix, y: iy, w: ISL_W, h: ISL_H }, pad: 1.03, hold: ISLAND_HOLD });
    islands[paper.id] = { el: isl, stop: stops.length - 1 };
    isl.dataset.stop = head.dataset.stop = orgs.dataset.stop = stops.length - 1;

    paper.panels.forEach(def => {
      const [c, r, w, h] = def.grid;
      const rect = {
        x: ix + ISL_PAD + c * (PW + GAP),
        y: iy + ISL_PAD + HEAD_H + r * (PH + GAP),
        w: w * PW + (w - 1) * GAP,
        h: h * PH + (h - 1) * GAP,
      };
      // larger blocks are laid out at 1x width and scaled up as a whole
      const k = rect.w / PW;
      const p = buildPanel(def, paper);
      place(p.el, { x: rect.x, y: rect.y, w: PW, h: rect.h / k });
      p.el.style.transform = `scale(${k})`;
      world.append(p.el);
      p.layout();
      stops.push({ kind: 'panel', paper, panel: p, rect, pad: 1.06, hold: def.hold || 8000 });
      p.el.dataset.stop = stops.length - 1;
    });
  });

  // ---------- panels ----------
  function buildPanel(def, paper) {
    const root = el('section', 'panel kind-' + def.kind + (def.layout ? ' layout-' + def.layout : ''));
    setAccent(root, paper.accent);
    const h2 = el('h2', '', def.title);
    const headRow = el('div', 'panel-head');
    headRow.append(h2);
    if (def.demo) {
      const btn = el('button', 'demo-btn', `${PLAY}<span>Watch demo</span>`);
      btn.addEventListener('click', e => {
        e.stopPropagation();
        if (stops[cur].panel !== p) go(+root.dataset.stop);
        openDemo(def, paper);
      });
      headRow.append(btn);
      root.demoBtn = btn;
    }
    root.append(headRow);
    const body = el('div', 'panel-body');
    root.append(body);

    const p = { def, paper, el: root, h2, body, frame: 0, set: 0, anns: [], active: false, secs: [], layout() {} };
    p.nFrames = () => p.secs.length ? p.secs[p.set].frames.length : 1;

    if (def.kind === 'table' && !def.image) {
      body.classList.add('column');
      body.append(buildRows(def));
      if (def.note) body.append(el('div', 'note', def.note));
      return p;
    }

    // A flipbook section: figure + side text. Panels with an `extra` flipbook get two
    // sections side by side; the inactive one collapses into a clickable strip.
    const makeSection = (container, frames, thumb, svg) => {
      const fig = el('div', 'fig'), box = el('div', 'figbox'), side = el('div', 'side');
      fig.append(box);
      container.append(fig, side);
      const sec = { frames, thumb: thumb || 0, fig, box, side };
      if (svg) {
        box.innerHTML = svg;
        box.classList.add('svgbox');
        sec.svg = box.querySelector('svg');
      } else if (frames && frames[0].src) {
        sec.imgs = frames.map(f => {
          const im = el('img', 'frame');
          im.src = f.src;
          box.append(im);
          return im;
        });
        sec.sizeSrc = sec.imgs[0];
      }
      if (frames) side.append(el('div', 'step-head'), el('div', 'step-text'), el('div', 'dots'));
      // click-only variants of the diagram: buttons that swap in another svg + captions
      if (svg && def.variants) {
        sec.base = { svg, frames };
        const bar = el('div', 'variants');
        def.variants.forEach((v, k) => {
          const b = el('button', k ? '' : 'on', v.label);
          b.addEventListener('click', e => {
            e.stopPropagation();
            touch();
            if (stops[cur].panel !== p) go(+root.dataset.stop);
            setVariant(p, sec, k);
          });
          bar.append(b);
        });
        side.append(bar);
        sec.vbar = bar;
      }
      return sec;
    };

    if (def.extra) {
      body.classList.add('accordion');
      [[def.frames, def.thumb, def.label], [def.extra.frames, def.extra.thumb, def.extra.label]].forEach(([frames, thumb, label], s) => {
        const wrap = el('div', 'sec'), inner = el('div', 'sec-inner'), strip = el('button', 'strip', `<span>${label}</span>`);
        wrap.append(inner, strip);
        body.append(wrap);
        const sec = makeSection(inner, frames, thumb, s === 0 ? def.svg : def.extra.svg);
        sec.wrap = wrap;
        sec.inner = inner;
        strip.addEventListener('click', e => {
          e.stopPropagation();
          touch();
          if (stops[cur].panel !== p) go(+root.dataset.stop);
          setSet(p, s);
        });
        p.secs.push(sec);
      });
    } else {
      const sec = makeSection(body, def.frames, def.thumb, def.svg);
      if (def.frames) p.secs.push(sec);
      p.fig = sec.fig;
      p.box = sec.box;
      p.side = sec.side;
      if (!def.frames && def.image) {
        const im = el('img', /\.jpe?g$/i.test(def.image) ? 'photo' : '');
        im.src = def.image;
        sec.box.append(im);
        sec.sizeSrc = im;
        p.single = sec;
      }
    }

    const side = p.side;
    if (def.kind === 'cover') {
      p.fig.style.flex = def.layout === 'stack' ? '1' : '1.5';
      side.innerHTML =
        `<div class="facts">${def.facts.map(f => `<div class="fact"><div class="big">${f.big}</div><div class="small">${f.small}</div></div>`).join('')}</div>` +
        `<div class="meta-col"><div class="badges">${def.badges.map(badge).join('')}</div></div>`;
    } else if (def.kind === 'table') {
      p.fig.style.flex = '1';
      side.style.flex = '1.15';
      side.append(buildRows(def, true));
      if (def.note) side.append(el('div', 'note', def.note));
    } else if (def.bullets) {
      side.append(el('ul', '', def.bullets.map(b => `<li>${b}</li>`).join('')));
    }

    // size each figure box to its media's aspect ratio (once in the DOM), then draw annotations
    p.layout = () => {
      if (def.extra) {
        // every section is laid out at its open width; collapsed ones are simply clipped
        const strip = 120, gap = 24;
        p.openW = body.clientWidth - (p.secs.length - 1) * (strip + gap);
        p.stripW = strip;
        p.secs.forEach(sec => { sec.inner.style.width = p.openW + 'px'; });
      }
      const fit = sec => {
        const src = sec.sizeSrc;
        if (!src) return;
        const onReady = () => {
          const nw = src.naturalWidth, nh = src.naturalHeight;
          if (!nw || !nh) return;
          const s = Math.min(sec.fig.clientWidth / nw, sec.fig.clientHeight / nh);
          sec.box.style.width = Math.round(nw * s) + 'px';
          sec.box.style.height = Math.round(nh * s) + 'px';
          if (sec === p.single && def.annotations) buildAnnotations(p, sec.box, def.annotations);
          refresh(p);
        };
        if (src.complete && src.naturalWidth) onReady();
        else src.addEventListener('load', onReady, { once: true });
      };
      p.secs.forEach(fit);
      if (p.single) fit(p.single);
      refresh(p);
    };
    return p;
  }

  function badge(b) {
    return b.award ? `<span class="award">${TROPHY}${b.award}</span>` : `<span>${b}</span>`;
  }

  function buildRows(def, compact) {
    const rows = el('div', 'rows' + (compact ? ' compact' : ''));
    def.rows.forEach(r => rows.append(el('div', 'row',
      `<span class="name">${r.name}</span><span class="chip ${r.status}">${r.verdict}</span><span class="text">${r.text}</span>`)));
    return rows;
  }

  function buildAnnotations(p, box, defs) {
    const W = box.clientWidth, H = box.clientHeight;
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'ann-layer');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    box.append(svg);
    const mk = (tag, attrs) => {
      const e = document.createElementNS(NS, tag);
      for (const k in attrs) e.setAttribute(k, attrs[k]);
      return e;
    };

    defs.forEach((a, k) => {
      const g = mk('g', { class: 'ann' });
      const delay = 0.35 + k * 0.5;
      g.style.setProperty('--d', delay + 's');
      g.style.setProperty('--d2', (delay + 1.0) + 's');
      svg.append(g);
      const ann = { def: a, nodes: [g] };

      if (a.box) {
        const [x, y, w, h] = a.box;
        g.append(mk('rect', { class: 'box', x: x / 100 * W, y: y / 100 * H, width: w / 100 * W, height: h / 100 * H, rx: 8 }));
      }
      if (a.ring) {
        const [x, y, r] = a.ring;
        g.append(mk('circle', { class: 'ring', cx: x / 100 * W, cy: y / 100 * H, r: r / 100 * W }));
      }
      if (a.text && a.label) {
        const lab = el('div', 'ann-label', a.text);
        lab.style.left = a.label[0] + '%';
        lab.style.top = a.label[1] + '%';
        lab.style.setProperty('--d', delay + 's');
        box.append(lab);
        ann.nodes.push(lab);
        // keep the label inside the figure so it never covers the side text
        const L = { w: lab.offsetWidth, h: lab.offsetHeight };
        L.x = Math.max(0, Math.min(lab.offsetLeft, W - L.w));
        L.y = Math.max(0, Math.min(lab.offsetTop, H - L.h));
        lab.style.left = L.x + 'px';
        lab.style.top = L.y + 'px';

        if (a.at) {
          const T = [a.at[0] / 100 * W, a.at[1] / 100 * H];
          // leave the label from the middle of the edge that faces the target, perpendicular to it
          const cx = L.x + L.w / 2, cy = L.y + L.h / 2;
          const horiz = Math.abs(T[0] - cx) / (L.w / 2) > Math.abs(T[1] - cy) / (L.h / 2);
          const n = horiz ? [Math.sign(T[0] - cx), 0] : [0, Math.sign(T[1] - cy)];
          const S = [cx + n[0] * L.w / 2, cy + n[1] * L.h / 2];
          const dist = Math.hypot(T[0] - S[0], T[1] - S[1]);
          const C = [S[0] + n[0] * dist * 0.5, S[1] + n[1] * dist * 0.5];
          // head: tip just short of the target, oriented along the curve's end tangent
          let ux = T[0] - C[0], uy = T[1] - C[1];
          const ul = Math.hypot(ux, uy) || 1;
          ux /= ul; uy /= ul;
          const hs = 28, tip = [T[0] - ux * 4, T[1] - uy * 4];
          const base = [tip[0] - ux * hs, tip[1] - uy * hs];
          const d = `M${S[0]},${S[1]} Q${C[0]},${C[1]} ${base[0]},${base[1]}`;
          const pts = [tip, [base[0] - uy * hs * 0.55, base[1] + ux * hs * 0.55], [base[0] + uy * hs * 0.55, base[1] - ux * hs * 0.55]]
            .map(q => q.join(',')).join(' ');
          // white halo first (line + head together), then the coloured arrow on top
          g.append(
            mk('path', { class: 'halo', d, pathLength: 1 }),
            mk('polygon', { class: 'head-halo', points: pts }),
            mk('path', { class: 'line', d, pathLength: 1 }),
            mk('polygon', { class: 'head', points: pts }));
        }
      }
      p.anns.push(ann);
    });
  }

  // show/hide annotations, flipbook frames and step text according to panel state
  function refresh(p) {
    const def = p.def;
    p.secs.forEach((sec, s) => {
      // unfocused panels (and the closed accordion section) show a representative thumbnail frame; while the camera
      // is inside their paper (primed) they wait at their first step instead (or stay where they were left), so they
      // never have to rewind once focused
      const f = p.active && s === p.set ? p.frame : p.primed ? (s === 0 ? p.left : 0) : sec.thumb;
      if (sec.imgs) sec.imgs.forEach((im, k) => im.classList.toggle('on', def.layered ? k <= f : k === f));
      if (sec.svg) {
        sec.svg.querySelectorAll('[data-from]').forEach(e => {
          const from = +e.dataset.from, to = e.dataset.to != null ? +e.dataset.to : Infinity;
          e.classList.toggle('on', f >= from && f <= to);
        });
        sec.frames.forEach((_, k) => sec.svg.classList.toggle('s' + k, k <= f));
        // transient animations (flying values, moving packets) only run on the focused step
        const live = p.active && s === p.set;
        sec.svg.querySelectorAll('[data-at]').forEach(e => e.classList.toggle('go', live && +e.dataset.at === f));
        // unfocused diagrams show their thumbnail's end state at once (else every step animates together on load)
        sec.svg.classList.toggle('still', !live);
      }
      const fr = sec.frames[Math.min(f, sec.frames.length - 1)];
      const head = sec.side.querySelector('.step-head'), text = sec.side.querySelector('.step-text');
      if (sec.shown !== fr) {
        head.innerHTML = fr.head;
        text.innerHTML = fr.text;
        // restart the fade-in on every step change
        if (sec.shown) {
          sec.side.classList.remove('swap');
          void sec.side.offsetWidth;
          sec.side.classList.add('swap');
        }
        sec.shown = fr;
      }
      const dots = sec.side.querySelector('.dots');
      if (dots.children.length !== sec.frames.length) {
        dots.innerHTML = sec.frames.map((_, k) => `<span data-frame="${k}"></span>`).join('');
      }
      [...dots.children].forEach((d, k) => d.classList.toggle('on', k === f));
      if (sec.wrap) {
        sec.wrap.classList.toggle('open', s === p.set);
        if (p.openW) sec.wrap.style.flexBasis = (s === p.set ? p.openW : p.stripW) + 'px';
      }
    });
    if (def.extra) p.h2.textContent = p.set ? def.extra.title : def.title;
    // the demo video belongs to the main flipbook: hide its button while the extra section is open
    if (def.extra && p.el.demoBtn) p.el.demoBtn.style.visibility = p.set ? 'hidden' : '';
    p.anns.forEach(a => {
      const show = p.active && (a.def.frame == null || a.def.frame === p.frame);
      a.nodes.forEach(n => n.classList.toggle('show', show));
    });
  }

  function setFrame(p, k) {
    p.frame = Math.max(0, Math.min(p.nFrames() - 1, k));
    refresh(p);
  }

  function setVariant(p, sec, k) {
    if (!sec.base || sec.variant === k) return;
    sec.variant = k;
    const v = p.def.variants[k];
    sec.box.innerHTML = v.svg || sec.base.svg;
    sec.svg = sec.box.querySelector('svg');
    sec.frames = v.frames || sec.base.frames;
    sec.shown = null;
    [...sec.vbar.children].forEach((b, i) => b.classList.toggle('on', i === k));
    p.frame = 0;
    refresh(p);
  }

  function setSet(p, s) {
    p.set = s;
    p.frame = 0;
    refresh(p);
  }

  function activate(p, lastFrame) {
    p.active = true;
    p.el.classList.add('active');
    p.frame = lastFrame ? p.nFrames() - 1 : 0;
    refresh(p);
  }

  function deactivate(p) {
    p.active = false;
    p.left = p.set === 0 && !p.secs.some(sec => sec.variant) ? p.frame : 0;
    p.secs.forEach(sec => { if (sec.base && sec.variant) setVariant(p, sec, 0); });
    p.set = 0;
    p.el.classList.remove('active');
    refresh(p);
  }

  // ---------- camera: smooth zoom+pan (van Wijk & Nuij, as in d3.interpolateZoom) ----------
  const CONTEXT_H = 84;   // screen px (at 1080p) reserved above a focused panel for the paper header
  const INSTANT = params.has('instant');   // for screenshots
  const CALM = matchMedia('(prefers-reduced-motion: reduce)').matches;   // jump instead of flying
  let cam = { x: WORLD_W / 2, y: WORLD_H / 2, w: WORLD_W };
  let raf = 0;

  // the fixed overlays (paper header, bottom bar, hints, demo player) are designed at 1080p and
  // scaled with the screen like the world, so they keep their relative size on a 4K or laptop screen
  let hud = 1;
  function setHud() {
    hud = Math.max(0.6, Math.min(2.5, innerWidth / 1920, innerHeight / 1080));
    document.documentElement.style.setProperty('--hud', hud);
  }

  function camFor(stop) {
    const r = stop.rect, pad = stop.pad || 1.05;
    const vw = viewport.clientWidth, vh = viewport.clientHeight;
    const top = stop.kind === 'panel' ? CONTEXT_H * hud : 0;
    const w = Math.max(r.w * pad, r.h * pad * vw / (vh - top));
    // shift the view up so the panel is centred in the area below the header
    return { x: r.x + r.w / 2, y: r.y + r.h / 2 - top / 2 * (w / vw), w };
  }

  function apply(c) {
    const vw = viewport.clientWidth, vh = viewport.clientHeight, s = vw / c.w;
    world.style.transform = `translate(${vw / 2 - c.x * s}px, ${vh / 2 - c.y * s}px) scale(${s})`;
  }

  function interpolateZoom(a, b) {
    const rho = Math.SQRT2, rho2 = 2, rho4 = 4;
    const [ux0, uy0, w0] = a, [ux1, uy1, w1] = b;
    const dx = ux1 - ux0, dy = uy1 - uy0, d2 = dx * dx + dy * dy;
    let S, f;
    if (d2 < 1e-6) {
      S = Math.log(w1 / w0) / rho;
      f = t => [ux0 + t * dx, uy0 + t * dy, w0 * Math.exp(rho * t * S)];
    } else {
      const d1 = Math.sqrt(d2);
      const b0 = (w1 * w1 - w0 * w0 + rho4 * d2) / (2 * w0 * rho2 * d1);
      const b1 = (w1 * w1 - w0 * w0 - rho4 * d2) / (2 * w1 * rho2 * d1);
      const r0 = Math.log(Math.sqrt(b0 * b0 + 1) - b0), r1 = Math.log(Math.sqrt(b1 * b1 + 1) - b1);
      S = (r1 - r0) / rho;
      f = t => {
        const s = t * S, c0 = Math.cosh(r0);
        const u = w0 / (rho2 * d1) * (c0 * Math.tanh(rho * s + r0) - Math.sinh(r0));
        return [ux0 + u * dx, uy0 + u * dy, w0 * c0 / Math.cosh(rho * s + r0)];
      };
    }
    f.duration = Math.abs(S) * 1000;
    return f;
  }

  function fly(target, done) {
    cancelAnimationFrame(raf);
    if (INSTANT || CALM) { cam = target; apply(cam); done && done(); return; }
    const f = interpolateZoom([cam.x, cam.y, cam.w], [target.x, target.y, target.w]);
    const dur = Math.min(2800, Math.max(1000, f.duration * 0.9));
    const t0 = performance.now();
    world.classList.add('moving');
    const step = now => {
      const t = Math.min(1, (now - t0) / dur);
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const [x, y, w] = f(e);
      cam = { x, y, w };
      apply(cam);
      if (t < 1) raf = requestAnimationFrame(step);
      else {
        world.classList.remove('moving');   // lets the browser re-rasterise crisply
        done && done();
      }
    };
    raf = requestAnimationFrame(step);
  }

  // ---------- tour state ----------
  let cur = 0, mode = 'auto', autoT = 0, idleT = 0, idleDeadline = 0;

  function go(idx, opts = {}) {
    idx = (idx + stops.length) % stops.length;
    const prev = stops[cur];
    if (prev.panel && idx !== cur) deactivate(prev.panel);
    cur = idx;
    clearTimeout(autoT);
    const s = stops[cur];
    updateBar();
    setHash();
    prime(s, false);
    fly(camFor(s), () => {
      prime(s, true);
      if (s.panel && !s.panel.active) activate(s.panel, opts.lastFrame);
      if (mode === 'auto') schedule();
    });
  }

  // zoomed into a paper: all its panels wait at their first step; zoomed out: they show their thumbnail.
  // Never mid-flight: zooming in primes once the camera has arrived, zooming out unprimes as it leaves.
  function prime(s, arrived) {
    stops.forEach(t => {
      if (!t.panel) return;
      const on = s.kind === 'panel' && t.paper === s.paper;
      if (t.panel.primed !== on && (arrived || !on)) { t.panel.primed = on; t.panel.left = 0; refresh(t.panel); }
    });
  }

  // per-frame hold times of a stop (the auto tour always plays the main flipbook)
  function holds(s) {
    const frames = s.panel && s.panel.def.frames;
    if (!frames) return [s.hold];
    return frames.map((f, k) => Math.max(f.hold || s.hold, readMs(f)) * (k === frames.length - 1 ? LAST_FRAME_BONUS : 1));
  }
  const stopDuration = s => holds(s).reduce((a, b) => a + b, 0);

  function schedule() {
    clearTimeout(autoT);
    const s = stops[cur], p = s.panel;
    const hs = holds(s), total = hs.reduce((a, b) => a + b, 0);
    const k = p && p.def.frames ? Math.min(p.frame, hs.length - 1) : 0;
    const done = hs.slice(0, k).reduce((a, b) => a + b, 0);
    animateTrack(done / total, (done + hs[k]) / total, hs[k]);
    autoT = setTimeout(() => {
      if (p && p.def.frames && p.set === 0 && p.frame < p.nFrames() - 1) {
        setFrame(p, p.frame + 1);
        schedule();
      } else {
        go(cur + 1);
      }
    }, hs[k]);
  }

  function next() {
    const p = stops[cur].panel;
    if (p && p.active && p.frame < p.nFrames() - 1) setFrame(p, p.frame + 1);
    else go(cur + 1);
  }

  function prev() {
    const p = stops[cur].panel;
    if (p && p.active && p.frame > 0) setFrame(p, p.frame - 1);
    else go(cur - 1, { lastFrame: true });
  }

  function zoomOut() {
    const s = stops[cur];
    if (s.kind === 'panel') go(islands[s.paper.id].stop);
    else if (s.kind !== 'overview') go(0);
  }

  // user did something: pause the tour, and resume it after IDLE_MS of quiet
  // (unless the presenter put it on hold, which lasts until they resume it)
  // (website: the visitor keeps control until they resume the tour themselves)
  function touch() {
    if (mode === 'auto') showHelp(HINT_MS * 0.75);
    if (!KIOSK) {
      if (mode !== 'held') hold();
      return;
    }
    if (mode === 'auto') {
      mode = 'manual';
      clearTimeout(autoT);
      freezeTrack();
    }
    clearTimeout(idleT);
    if (mode === 'manual') {
      idleT = setTimeout(resume, IDLE_MS);
      idleDeadline = Date.now() + IDLE_MS;
    }
    updateBar();
  }

  function resume() {
    clearTimeout(idleT);
    mode = 'auto';
    updateBar();
    if (cur === 0) schedule();
    else go(0);
  }

  function hold() {
    clearTimeout(autoT);
    clearTimeout(idleT);
    if (mode === 'auto') freezeTrack();
    mode = 'held';
    updateBar();
  }

  // P / status button: hold indefinitely, or continue the tour from here
  function togglePause() {
    if (mode !== 'held') hold();
    else {
      mode = 'auto';
      updateBar();
      const p = stops[cur].panel;
      if (p && p.set) setSet(p, 0);
      schedule();
    }
  }

  // ---------- per-paper timeline: one segment per stop ----------
  let trackKey = null, trackSegs = [];

  function renderTrack() {
    const s = stops[cur];
    const key = s.paper ? s.paper.id : 'overview';
    if (key === trackKey) return;
    trackKey = key;
    const idxs = stops.map((_, i) => i).filter(i => (stops[i].paper ? stops[i].paper.id : 'overview') === key);
    track.innerHTML = '';
    trackSegs = idxs.map(i => {
      const seg = el('div', 'seg', '<div></div>');
      seg.style.flexGrow = stopDuration(stops[i]);
      seg.dataset.idx = i;
      seg.title = stops[i].panel ? stops[i].panel.def.title : stops[i].kind;
      seg.addEventListener('click', e => { e.stopPropagation(); touch(); go(i); });
      track.append(seg);
      return seg;
    });
    setAccent(track, s.paper ? s.paper.accent : '#777777');
  }

  // the fill is scaled rather than resized: transforms animate smoothly at sub-pixel precision
  // on the compositor, even while the camera is flying
  function setFill(seg, frac, ms) {
    const fill = seg.firstChild;
    fill.style.transition = ms ? `transform ${ms}ms linear` : 'none';
    fill.style.transform = `scaleX(${frac})`;
  }

  function syncTrack() {
    renderTrack();
    trackSegs.forEach(seg => {
      const i = +seg.dataset.idx;
      seg.classList.toggle('current', i === cur);
      if (i !== cur) setFill(seg, i < cur ? 1 : 0);
    });
  }

  function animateTrack(from, to, ms) {
    syncTrack();
    const seg = trackSegs.find(s => +s.dataset.idx === cur);
    if (!seg) return;
    setFill(seg, from);
    void seg.offsetWidth;
    setFill(seg, to, ms);
  }

  function freezeTrack() {
    trackSegs.forEach(seg => {
      const fill = seg.firstChild, t = getComputedStyle(fill).transform;
      fill.style.transition = 'none';
      fill.style.transform = t;
    });
  }

  // ---------- bottom bar ----------
  const chips = PAPERS.map(paper => {
    const b = el('button', '', `<img src="${paper.logo}" alt="">${paper.logoOn ? `<img class="on-logo" src="${paper.logoOn}" alt="">` : ''}${paper.name}`);
    setAccent(b, paper.accent);
    b.addEventListener('click', e => { e.stopPropagation(); touch(); go(islands[paper.id].stop); });
    chipsNav.append(b);
    return b;
  });

  const context = document.getElementById('context');
  function updateBar() {
    const s = stops[cur];
    const id = s.paper && s.paper.id;
    if (s.kind === 'panel') {
      setAccent(context, s.paper.accent);
      context.innerHTML = `<img src="${s.paper.logo}" alt=""><span class="cname">${s.paper.name}</span><span class="cvenue">${s.paper.venue}</span>`;
    }
    context.classList.toggle('on', s.kind === 'panel');
    chips.forEach((c, i) => c.classList.toggle('on', PAPERS[i].id === id));
    Object.entries(islands).forEach(([pid, isl]) => isl.el.classList.toggle('current', pid === id));
    document.body.classList.toggle('manual', mode !== 'auto');
    statusBtn.classList.toggle('paused', mode !== 'auto');
    statusBtn.classList.toggle('held', mode === 'held');
    if (mode === 'auto') statusBtn.innerHTML = '<span class="dot"></span>Auto tour';
    else if (mode === 'held') {
      statusBtn.innerHTML = `<span class="dot"></span>Paused${KIOSK ? '' : ' · <span class="resume">resume tour</span>'}`;
      syncTrack();
    } else {
      const left = Math.max(0, Math.ceil((idleDeadline - Date.now()) / 1000));
      statusBtn.innerHTML = `<span class="dot"></span><span>Paused · resumes in <span class="secs">${left}</span>s</span>`;
      syncTrack();
    }
  }
  setInterval(() => { if (mode === 'manual') updateBar(); }, 1000);
  statusBtn.addEventListener('click', e => { e.stopPropagation(); togglePause(); });

  // ---------- prerecorded demo videos ----------
  const modal = document.getElementById('demo');
  const video = modal.querySelector('video');
  let modeBeforeDemo = null;

  function openDemo(def, paper) {
    // the tour stays put while the video is open; afterwards it picks up where the presenter left it
    modeBeforeDemo = mode === 'held' ? 'held' : 'manual';
    hold();
    setAccent(modal, paper.accent);
    modal.querySelector('.demo-title').innerHTML =
      `<img src="${paper.logo}" alt=""><span class="cname">${paper.name}</span><span>${def.demoTitle || 'Proof-of-concept demo'}</span>`;
    video.src = def.demo;
    buildSteps(def.demoSteps || []);
    modal.classList.add('on');
    video.currentTime = 0;
    video.play().catch(() => {});
    trackSteps();
  }

  // timeline of the demo's steps next to the video, driven by the playback position
  // (so pausing, seeking and replaying stay in sync)
  const stepList = modal.querySelector('.demo-steps');
  let demoSteps = [], stepRaf = 0;
  function buildSteps(steps) {
    demoSteps = steps;
    modal.classList.toggle('no-steps', !steps.length);
    stepList.innerHTML = steps.map(([t, text]) =>
      `<li data-t="${t}"><span class="lbl">${text}</span><i class="bar"><b></b></i></li>`).join('');
  }
  function trackSteps() {
    cancelAnimationFrame(stepRaf);
    const items = [...stepList.children], now = video.currentTime;
    items.forEach((li, k) => {
      const t0 = demoSteps[k][0], t1 = k + 1 < demoSteps.length ? demoSteps[k + 1][0] : video.duration || t0 + 1;
      li.classList.toggle('done', now >= t0);
      li.classList.toggle('now', now >= t0 && now < t1);
      li.querySelector('b').style.height = Math.max(0, Math.min(1, (now - t0) / (t1 - t0))) * 100 + '%';
    });
    if (modal.classList.contains('on')) stepRaf = requestAnimationFrame(trackSteps);
  }
  stepList.addEventListener('click', e => {
    const li = e.target.closest('li');
    if (!li) return;
    video.currentTime = +li.dataset.t;
    video.play().catch(() => {});
  });

  function closeDemo() {
    if (!modal.classList.contains('on')) return;
    video.pause();
    modal.classList.remove('on');
    mode = modeBeforeDemo;
    touch();
  }

  modal.addEventListener('click', e => { if (e.target === modal || e.target.closest('.demo-close')) closeDemo(); });

  // while the video is open, keys drive the player rather than the tour
  document.addEventListener('keydown', e => {
    if (!modal.classList.contains('on')) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const k = e.key;
    if (k === 'Escape' || k === 'v' || k === 'V') closeDemo();
    else if (k === ' ' || k === 'k' || k === 'p' || k === 'P') video.paused ? video.play() : video.pause();
    else if (k === 'ArrowLeft') video.currentTime = Math.max(0, video.currentTime - 5);
    else if (k === 'ArrowRight') video.currentTime = Math.min(video.duration || 0, video.currentTime + 5);
    else if (k === 'f' || k === 'F') toggleFullscreen();
  }, true);

  // ---------- input ----------
  // in fullscreen the browser takes Esc to exit; Chromium can hand it back to us (Keyboard Lock: Esc zooms out,
  // holding Esc still exits). Elsewhere ↑ zooms out too.
  function toggleFullscreen() {
    if (document.fullscreenElement) { document.exitFullscreen(); return; }
    document.documentElement.requestFullscreen()
      .then(() => navigator.keyboard && navigator.keyboard.lock && navigator.keyboard.lock(['Escape']))
      .catch(() => {});
  }
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && navigator.keyboard && navigator.keyboard.unlock) navigator.keyboard.unlock();
  });

  viewport.addEventListener('click', e => {
    if (e.target.closest('a')) return;   // paper / code links open in a new tab
    touch();
    const dot = e.target.closest('.dots span');
    const hit = e.target.closest('[data-stop]');
    if (!hit) { zoomOut(); return; }
    const idx = +hit.dataset.stop;
    const s = stops[idx];
    if (idx !== cur) {
      go(idx);
      if (dot && s.panel) setTimeout(() => setFrame(s.panel, +dot.dataset.frame), 50);
      return;
    }
    if (s.panel) {
      if (dot) setFrame(s.panel, +dot.dataset.frame);
      else if (s.panel.nFrames() > 1) next();
    } else if (s.kind === 'island') {
      zoomOut();
    }
  });

  document.addEventListener('keydown', e => {
    const k = e.key;
    if (k === 'f' || k === 'F') { toggleFullscreen(); return; }
    if (k === 'p' || k === 'P') { togglePause(); return; }
    if (k === 'v' || k === 'V') {
      const p = stops[cur].panel;
      if (p && p.def.demo) openDemo(p.def, p.paper);
      return;
    }
    touch();
    if (k === 'ArrowRight' || k === ' ' || k === 'PageDown' || k === 'Enter') { e.preventDefault(); next(); }
    else if (k === 'ArrowLeft' || k === 'PageUp' || k === 'Backspace') { e.preventDefault(); prev(); }
    else if (k === 'Escape' || k === 'ArrowUp') zoomOut();
    else if (k === 'Home' || k === 'o' || k === '0') go(0);
    else if (/^[1-9]$/.test(k) && PAPERS[+k - 1]) go(islands[PAPERS[+k - 1].id].stop);
  });

  // swipe left/right to step (taps are clicks)
  let swipe = null;
  viewport.addEventListener('touchstart', e => {
    swipe = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
  }, { passive: true });
  viewport.addEventListener('touchend', e => {
    if (!swipe) return;
    const t = e.changedTouches[0], dx = t.clientX - swipe.x, dy = t.clientY - swipe.y;
    swipe = null;
    if (Math.abs(dx) < 50 || Math.abs(dx) < 1.5 * Math.abs(dy)) return;
    touch();
    dx < 0 ? next() : prev();
  });

  // hide the cursor when the mouse is still (kiosk)
  let cursorT = 0;
  document.addEventListener('mousemove', () => {
    if (!KIOSK) return;
    document.body.classList.remove('hide-cursor');
    clearTimeout(cursorT);
    cursorT = setTimeout(() => document.body.classList.add('hide-cursor'), 2500);
  });

  window.addEventListener('resize', () => { setHud(); cam = camFor(stops[cur]); apply(cam); });

  // a background tab does not advance the tour; it picks up the current step when shown again
  document.addEventListener('visibilitychange', () => {
    if (mode !== 'auto') return;
    if (document.hidden) { clearTimeout(autoT); freezeTrack(); }
    else schedule();
  });

  // ---------- navigation hints: shown at the start and when the visitor takes over, then fade ----------
  const help = document.getElementById('help');
  let helpT = 0;
  function showHelp(ms = HINT_MS) {
    if (KIOSK) return;
    if (matchMedia('(pointer: coarse)').matches)
      help.innerHTML = (innerHeight > innerWidth ? 'Rotate for a larger view · ' : '') +
        'Swipe to step · tap a panel to zoom in, outside to zoom out';
    help.classList.add('on');
    clearTimeout(helpT);
    helpT = setTimeout(() => help.classList.remove('on'), ms);
  }

  // ---------- shareable links: #badram, #ddrop-parity, ... (also #batteringram, #ddropattack as per domain) ----------
  const stopId = s => s.kind === 'overview' ? '' : s.kind === 'island' ? s.paper.id :
    s.kind === 'panel' ? s.panel.def.id : 'to-' + s.paper.id;
  function setHash() {
    if (params.has('stop')) return;
    const id = stopId(stops[cur]);
    if (decodeURIComponent(location.hash.slice(1)) !== id) history.replaceState(null, '', id ? '#' + id : location.pathname + location.search);
  }
  function stopFromHash() {
    const h = decodeURIComponent(location.hash.slice(1)).toLowerCase();
    if (!h) return -1;
    const paper = PAPERS.find(p => p.url.split('.')[0] === h);
    return paper ? islands[paper.id].stop : stops.findIndex(s => stopId(s) === h);
  }
  window.addEventListener('hashchange', () => {
    const i = stopFromHash();
    if (i >= 0 && i !== cur) go(i);
  });

  // ---------- start ----------
  setHud();
  cam = camFor(stops[0]);
  apply(cam);
  updateBar();
  showHelp();
  requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.remove('preload')));
  if (params.has('stop')) {
    // deep link for testing: ?stop=N[&frame=K][&extra]
    touch();
    go(+params.get('stop'));
    const p = stops[cur].panel;
    if (p && params.has('extra')) setSet(p, 1);
    if (p && params.has('frame')) setFrame(p, +params.get('frame'));
    // freeze every animation at t ms (screenshots of mid-animation states)
    if (params.has('t')) setTimeout(() => document.getAnimations().forEach(a => { a.pause(); a.currentTime = +params.get('t'); }), 300);
  } else if (stopFromHash() > 0) go(stopFromHash());
  else schedule();
})();
