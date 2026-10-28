// Language switch, scroll reveals and the sticky phone in "How it plays".
(() => {
  const html = document.documentElement;
  const button = document.querySelector("[data-lang-toggle]");
  const setLang = (lang) => {
    html.lang = lang;
    try { localStorage.setItem("sideb.lang", lang); } catch {}
    if (button) button.textContent = lang === "ko" ? "English" : "한국어";
    document.dispatchEvent(new Event("langchange"));
  };
  button?.addEventListener("click", () => setLang(html.lang === "ko" ? "en" : "ko"));
  setLang(html.lang);

  const reveal = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) { entry.target.classList.add("in"); reveal.unobserve(entry.target); }
    }
  }, { threshold: 0.15 });
  document.querySelectorAll("[data-reveal]").forEach((node) => reveal.observe(node));

  const shots = [...document.querySelectorAll("[data-shot]")];
  const steps = [...document.querySelectorAll("[data-step]")];
  const show = (name) => {
    shots.forEach((s) => s.classList.toggle("on", s.dataset.shot === name));
    steps.forEach((s) => s.classList.toggle("on", s.dataset.step === name));
  };
  const stepWatch = new IntersectionObserver((entries) => {
    for (const entry of entries) if (entry.isIntersecting) show(entry.target.dataset.step);
  }, { rootMargin: "-45% 0px -45% 0px" });
  steps.forEach((s) => stepWatch.observe(s));
})();
