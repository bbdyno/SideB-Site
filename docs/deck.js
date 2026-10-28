// The Side B deck, on the web. Same plan view and measurements as the app
// (TurntableView.swift): drag the tonearm off its rest and drop it on the
// record to hear the surface noise and the room mixed live with Web Audio.
(() => {
  const root = document.querySelector("[data-deck]");
  if (!root) return;

  const NS = "http://www.w3.org/2000/svg";
  const C = { x: 400, y: 530 };
  const PLATTER = 355, RECORD = 335, LABEL = 112, LEAD_IN = 322, RUN_OUT = 135;
  const PIVOT = { x: 865, y: 150 }, ARM = 600;
  const DEMO_SECONDS = 75;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const needle = (a) => ({ x: PIVOT.x - ARM * Math.sin(a), y: PIVOT.y + ARM * Math.cos(a) });
  const angleFor = (radius) => {
    let lo = 0, hi = 1.2;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2, n = needle(mid);
      if (Math.hypot(n.x - C.x, n.y - C.y) > radius) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  };
  const OUTER = angleFor(LEAD_IN), INNER = angleFor(RUN_OUT), MAX = INNER + 0.04;
  const deg = (r) => (r * 180) / Math.PI;

  const copy = {
    en: {
      rest: "Drag the arm onto the record.",
      playing: "Playing. Move the arm to skip, or back to its rest.",
      runout: "End of side. Lift the arm.",
      loading: "Warming up the deck…",
      drop: "Drop the needle", lift: "Lift the needle",
      themes: { vinyl: "Vinyl", rain: "Rain", fireplace: "Fireplace", waves: "Waves" },
      label: "Try me",
    },
    ko: {
      rest: "암을 판 위로 끌어다 놓아 보세요.",
      playing: "재생 중이에요. 암을 옮기면 건너뛰고, 받침에 두면 멈춰요.",
      runout: "면이 끝났어요. 암을 들어 올리세요.",
      loading: "덱을 데우는 중…",
      drop: "바늘 내리기", lift: "바늘 들기",
      themes: { vinyl: "바이닐", rain: "빗소리", fireplace: "벽난로", waves: "파도" },
      label: "들어 보기",
    },
  };
  const t = () => copy[document.documentElement.lang === "ko" ? "ko" : "en"];

  const mixes = {
    vinyl: { crackle: 0.55, room: null, level: 0 },
    rain: { crackle: 0.3, room: "rain", level: 0.7 },
    fireplace: { crackle: 0.3, room: "fireplace", level: 0.75 },
    waves: { crackle: 0.25, room: "waves", level: 0.7 },
  };

  // ---------- Drawing ----------

  const el = (name, attrs = {}, parent) => {
    const node = document.createElementNS(NS, name);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    if (parent) parent.appendChild(node);
    return node;
  };

  const svg = el("svg", { viewBox: "0 0 1000 1000", class: "deck-svg", role: "img" });
  svg.setAttribute("aria-label", "Side B turntable");
  el("rect", { x: 1, y: 1, width: 998, height: 998, rx: 40, class: "d-plinth" }, svg);
  el("circle", { cx: C.x, cy: C.y, r: PLATTER + 12, class: "d-well" }, svg);
  el("circle", { cx: C.x, cy: C.y, r: PLATTER, class: "d-platter" }, svg);
  for (let i = 0; i < 6; i++) el("rect", { x: 765, y: 790 + i * 16, width: 170, height: 7, rx: 3.5, class: "d-well" }, svg);
  el("text", { x: 80, y: 70, class: "d-print" }, svg).textContent = "33⅓";
  const lamp = el("circle", { cx: 812, cy: 955, r: 13, class: "d-lamp" }, svg);
  el("text", { x: 838, y: 965, class: "d-print" }, svg).textContent = "Rec";

  const record = el("g", {}, svg);
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2, r = PLATTER - 8;
    el("circle", { cx: C.x + r * Math.cos(a), cy: C.y + r * Math.sin(a), r: 1.8, class: "d-strobe" }, record);
  }
  el("circle", { cx: C.x, cy: C.y, r: RECORD, class: "d-vinyl" }, record);
  for (let r = LEAD_IN, i = 0; r > RUN_OUT; r -= 4.2, i++) {
    const o = i % 7 === 0 ? 0.55 : i % 2 === 0 ? 0.32 : 0.18;
    el("circle", { cx: C.x, cy: C.y, r, class: "d-groove", "stroke-opacity": o }, record);
  }
  el("circle", { cx: C.x, cy: C.y, r: LEAD_IN + 4, class: "d-groove", "stroke-width": 1.4 }, record);
  el("circle", { cx: C.x, cy: C.y, r: LABEL, class: "d-label" }, record);
  el("text", { x: C.x, y: C.y - 50, class: "d-label-text d-mono" }, record).textContent = "Side B";
  el("line", { x1: C.x - 62, y1: C.y + 30, x2: C.x + 62, y2: C.y + 30, class: "d-label-rule" }, record);
  const labelTitle = el("text", { x: C.x, y: C.y + 66, class: "d-label-text" }, record);
  el("circle", { cx: C.x, cy: C.y, r: 11, class: "d-metal" }, record);

  el("rect", { x: PIVOT.x - 25, y: PIVOT.y + ARM - 181, width: 50, height: 22, rx: 6, class: "d-control" }, svg);

  const arm = el("g", { class: "d-arm" }, svg);
  const tip = needle(0);
  el("rect", { x: PIVOT.x - 30, y: PIVOT.y - 120, width: 60, height: 70, rx: 8, class: "d-shade" }, arm);
  el("line", { x1: PIVOT.x, y1: PIVOT.y - 50, x2: PIVOT.x, y2: tip.y - 75, class: "d-tube" }, arm);
  el("rect", { x: PIVOT.x - 20, y: tip.y - 82, width: 40, height: 85, rx: 6, class: "d-headshell" }, arm);
  el("rect", { x: PIVOT.x + 12, y: tip.y - 64, width: 35, height: 8, rx: 4, class: "d-shade" }, arm);
  el("circle", { cx: PIVOT.x, cy: PIVOT.y, r: 55, class: "d-control d-edge" }, arm);
  el("circle", { cx: PIVOT.x, cy: PIVOT.y, r: 22, class: "d-metal" }, arm);
  // A generous invisible hit area along the arm, so it is easy to grab on a phone.
  const grip = el("line", { x1: PIVOT.x, y1: PIVOT.y - 110, x2: PIVOT.x, y2: tip.y + 10, class: "d-grip" }, arm);

  root.querySelector("[data-deck-stage]").appendChild(svg);
  const hint = root.querySelector("[data-deck-hint]");
  const clock = root.querySelector("[data-deck-time]");
  const meter = root.querySelector("[data-deck-meter]");
  const toggle = root.querySelector("[data-deck-toggle]");
  const keys = [...root.querySelectorAll("[data-theme]")];
  for (let i = 0; i < 20; i++) meter.appendChild(document.createElement("i"));
  const bars = [...meter.children];

  // ---------- Audio ----------

  let ctx, master, deckGain, roomGain, analyser, crackleSource, roomSource, roomName;
  const buffers = {};
  const load = async (name) => {
    if (buffers[name]) return buffers[name];
    const data = await fetch(`assets/audio/${name}.wav`).then((r) => r.arrayBuffer());
    buffers[name] = await ctx.decodeAudioData(data);
    return buffers[name];
  };

  const ensureAudio = async () => {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      master.connect(analyser).connect(ctx.destination);
      deckGain = ctx.createGain(); deckGain.connect(master);
      roomGain = ctx.createGain(); roomGain.connect(master);
      ["fx-needle-drop", "fx-needle-lift", "fx-arm-rest", "fx-key"].forEach((n) => load(n).catch(() => {}));
    }
    if (ctx.state === "suspended") await ctx.resume();
  };

  const fx = (name, gain = 0.6) => {
    if (!ctx || !buffers[name]) return;
    const src = ctx.createBufferSource(), g = ctx.createGain();
    src.buffer = buffers[name]; g.gain.value = gain;
    src.connect(g).connect(master); src.start();
  };

  const ramp = (param, value, seconds) => {
    const now = ctx.currentTime;
    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);
    param.linearRampToValueAtTime(value, now + seconds);
  };

  const startRoom = async (name, level) => {
    const old = roomSource;
    roomSource = null; roomName = name;
    if (old) { const g = old._gain; ramp(g.gain, 0, 0.4); old.stop(ctx.currentTime + 0.45); }
    if (!name) return;
    const buffer = await load(name);
    if (roomName !== name || !playing()) return;
    const src = ctx.createBufferSource(), g = ctx.createGain();
    src.buffer = buffer; src.loop = true; g.gain.value = 0;
    src.connect(g).connect(roomGain); src._gain = g; src.start();
    ramp(g.gain, level, 0.4);
    roomSource = src;
  };

  const startSound = async () => {
    hint.textContent = t().loading;
    const buffer = await load("crackle");
    if (!playing()) return;
    crackleSource = ctx.createBufferSource();
    crackleSource.buffer = buffer; crackleSource.loop = true;
    crackleSource.connect(deckGain);
    // The drop knocks the platter a little off speed.
    crackleSource.playbackRate.setValueAtTime(0.94, ctx.currentTime);
    crackleSource.playbackRate.linearRampToValueAtTime(1, ctx.currentTime + 0.35);
    deckGain.gain.setValueAtTime(0, ctx.currentTime);
    ramp(deckGain.gain, mixes[theme].crackle, 0.25);
    roomGain.gain.value = 1;
    crackleSource.start();
    startRoom(mixes[theme].room, mixes[theme].level);
    updateHint();
  };

  const stopSound = (seconds = 0.06) => {
    if (!ctx) return;
    ramp(deckGain.gain, 0, seconds); ramp(roomGain.gain, 0, seconds);
    const end = ctx.currentTime + seconds + 0.02;
    crackleSource?.stop(end); roomSource?.stop(end);
    crackleSource = roomSource = null; roomName = null;
  };

  // ---------- State and motion ----------

  let theme = "rain";
  let armAngle = 0, armVelocity = 0, armTarget = 0;
  let state = "rest"; // rest | lifted | playing | runout
  let progress = 0, spin = 0, speed = 0, last = performance.now();
  let drag = null;
  const playing = () => state === "playing" || state === "runout";

  const updateHint = () => {
    hint.textContent = state === "runout" ? t().runout : playing() ? t().playing : t().rest;
    toggle.textContent = playing() ? t().lift : t().drop;
    labelTitle.textContent = t().label;
    keys.forEach((k) => (k.querySelector("span").textContent = t().themes[k.dataset.theme]));
    root.classList.toggle("is-playing", playing());
  };

  const touchAngle = (event) => {
    const p = svg.createSVGPoint();
    p.x = event.clientX; p.y = event.clientY;
    const local = p.matrixTransform(svg.getScreenCTM().inverse());
    return Math.atan2(PIVOT.x - local.x, local.y - PIVOT.y);
  };

  const lift = () => {
    if (!playing()) return;
    stopSound();
    fx("fx-needle-lift", 0.45);
    state = "lifted";
  };

  const settle = (angle) => {
    if (angle >= OUTER - 0.015) {
      progress = Math.min(Math.max((angle - OUTER) / (INNER - OUTER), 0), 0.999);
      armTarget = angle; armAngle = angle;
      state = "playing";
      fx("fx-needle-drop", 0.75);
      navigator.vibrate?.(30);
      startSound();
    } else {
      state = "rest";
      armTarget = 0;
      setTimeout(() => fx("fx-arm-rest", 0.5), reduceMotion ? 0 : 320);
    }
    updateHint();
  };

  arm.addEventListener("pointerdown", async (event) => {
    event.preventDefault();
    grip.setPointerCapture(event.pointerId);
    await ensureAudio();
    if (playing()) lift();
    else if (state === "rest") fx("fx-arm-rest", 0.4);
    state = "lifted";
    drag = { arm: armAngle, touch: touchAngle(event) };
    root.classList.add("is-lifted");
  });
  svg.addEventListener("pointermove", (event) => {
    if (!drag) return;
    armAngle = armTarget = Math.min(Math.max(drag.arm + touchAngle(event) - drag.touch, 0), MAX);
    armVelocity = 0;
  });
  const release = () => {
    if (!drag) return;
    drag = null;
    root.classList.remove("is-lifted");
    settle(armAngle);
  };
  svg.addEventListener("pointerup", release);
  svg.addEventListener("pointercancel", release);

  toggle.addEventListener("click", async () => {
    await ensureAudio();
    if (playing()) { lift(); state = "rest"; armTarget = 0; setTimeout(() => fx("fx-arm-rest", 0.5), 320); updateHint(); }
    else settle(OUTER);
  });

  keys.forEach((key) => key.addEventListener("click", async () => {
    await ensureAudio();
    fx("fx-key", 0.35);
    theme = key.dataset.theme;
    keys.forEach((k) => k.setAttribute("aria-pressed", k === key));
    if (playing()) {
      ramp(deckGain.gain, mixes[theme].crackle, 0.4);
      startRoom(mixes[theme].room, mixes[theme].level);
    }
  }));

  const levelData = new Uint8Array(512);
  const frame = (now) => {
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;

    const motor = state !== "rest" || drag;
    speed += ((motor ? 200 : 0) - speed) * (1 - Math.exp(-dt / (motor ? 0.18 : 0.9)));
    if (!motor && speed < 0.5) speed = 0;
    spin = (spin + speed * dt) % 360;
    record.setAttribute("transform", `rotate(${spin} ${C.x} ${C.y})`);

    if (state === "playing" && !drag) {
      progress += dt / DEMO_SECONDS;
      if (progress >= 1) { progress = 1; state = "runout"; updateHint(); }
      armAngle = armTarget = OUTER + (INNER - OUTER) * progress;
    } else if (!drag) {
      // A light spring so the arm swings home and settles with a small bounce.
      const stiffness = 90, damping = 11;
      armVelocity += ((armTarget - armAngle) * stiffness - armVelocity * damping) * dt;
      armAngle += armVelocity * dt;
      if (reduceMotion) { armAngle = armTarget; armVelocity = 0; }
    }
    arm.setAttribute("transform", `rotate(${deg(armAngle)} ${PIVOT.x} ${PIVOT.y})`);

    const elapsed = progress * DEMO_SECONDS;
    clock.textContent = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(Math.floor(elapsed % 60)).padStart(2, "0")}`;

    let level = 0;
    if (analyser && playing()) {
      analyser.getByteTimeDomainData(levelData);
      let sum = 0;
      for (const v of levelData) sum += ((v - 128) / 128) ** 2;
      const db = 20 * Math.log10(Math.sqrt(sum / levelData.length) + 1e-6);
      level = Math.max(0, Math.min(1, (db + 50) / 50));
    }
    bars.forEach((b, i) => b.classList.toggle("on", i / 20 < level));
    requestAnimationFrame(frame);
  };

  document.addEventListener("langchange", updateHint);
  keys.forEach((k) => k.setAttribute("aria-pressed", k.dataset.theme === theme));
  updateHint();
  requestAnimationFrame(frame);
})();
