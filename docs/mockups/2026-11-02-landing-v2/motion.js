// Entrance for the landing mockups: each .reveal fades and rises once as it enters the viewport, staggered 70 ms
// within its section. If this script never runs, the failsafe class set in <head> keeps everything visible.
(() => {
  window.__motion = true;
  const items = [...document.querySelectorAll('.reveal')];
  const groups = new Map();
  for (const el of items) {
    const key = el.closest('section') ?? document.body;
    const n = groups.get(key) ?? 0;
    el.style.setProperty('--d', `${Math.min(n, 4) * 70}ms`);
    groups.set(key, n + 1);
  }
  if (!('IntersectionObserver' in window)) { items.forEach((el) => el.classList.add('in')); return; }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }, { rootMargin: '0px 0px -8% 0px' });
  items.forEach((el) => io.observe(el));
})();
