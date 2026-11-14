// A three-question practice session in the learner app's style (practice session screen), for the landing mockups.
// Sentences, options, hints, explanations and translations come from apps/web/messages/vi.json (namespace Cloze).
const ITEMS = [
  { source: 'Câu đã gặp · phim', before: 'Can I', answer: 'borrow', after: 'your charger for a minute?', options: ['borrow', 'lend', 'rent', 'owe'],
    hint: 'Gợi ý: hỏi xin dùng tạm đồ của người khác.', explanation: 'borrow = mượn (dùng rồi trả). Khác lend = cho mượn.', translation: '“Cho mình mượn cục sạc một chút được không?”' },
  { source: 'Câu đã gặp · email', before: "Don't", answer: 'assume', after: 'that everyone has read the email.', options: ['assume', 'resume', 'consume', 'assure'],
    hint: 'Gợi ý: cho là đúng khi chưa kiểm chứng.', explanation: 'assume = cho rằng, mặc định là đúng (khi chưa xác minh).', translation: '“Đừng mặc định rằng ai cũng đã đọc email.”' },
  { source: 'Câu đã gặp · tin nhắn công việc', before: 'We plan to', answer: 'deploy', after: 'the new version on Friday.', options: ['deploy', 'delay', 'deliver', 'decide'],
    hint: 'Gợi ý: đưa phiên bản phần mềm tới người dùng.', explanation: 'deploy = triển khai, phát hành (phần mềm, hệ thống).', translation: '“Bọn mình dự kiến triển khai bản mới vào thứ Sáu.”' },
];

function mountPractice(root, { signupHref = '#dang-ky', items = ITEMS } = {}) {
  let i = 0, tried = new Set(), solved = false, firstTry = 0;
  const live = Object.assign(document.createElement('p'), { className: 'sr-only' });
  live.setAttribute('aria-live', 'polite');

  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; };

  function progress() {
    const p = el('span', 'q-progress');
    items.forEach((_, k) => p.append(el('i', k < i ? 'done' : k === i ? 'now' : '')));
    return p;
  }

  function render() {
    root.replaceChildren();
    if (i >= items.length) return done();
    const it = items[i];
    const head = el('div', 'q-head');
    head.append(progress(), el('span', 'chip chip-soft', it.source));
    const s = el('p', 'q-sentence'); s.lang = 'en';
    s.append(`${it.before} `, el('span', 'q-blank' + (solved ? ' right' : ''), solved ? it.answer : ' '), ` ${it.after}`);
    const opts = el('div', 'q-opts'); opts.setAttribute('role', 'group'); opts.setAttribute('aria-label', 'Chọn từ điền vào chỗ trống');
    it.options.forEach((o, k) => {
      const b = el('button', 'q-opt'); b.type = 'button';
      b.append(el('kbd', '', String(k + 1)), Object.assign(el('span', '', o), { lang: 'en' }));
      if (tried.has(o)) b.classList.add('wrong');
      if (solved && o === it.answer) b.classList.add('right');
      b.disabled = solved || tried.has(o);
      b.addEventListener('click', () => choose(o));
      opts.append(b);
    });
    const fb = el('div', 'q-fb ' + (solved ? 'right' : tried.size ? 'wrong' : 'idle'));
    if (solved) {
      fb.append(el('b', '', 'Đúng rồi'), el('span', '', it.explanation), el('span', '', it.translation));
      const row = el('div', 'q-row');
      const next = el('button', 'btn btn-sticker', i + 1 < items.length ? 'Câu tiếp' : 'Xem kết quả'); next.type = 'button';
      next.addEventListener('click', () => { i++; tried = new Set(); solved = false; render(); root.querySelector('.q-opt')?.focus(); });
      row.append(next); fb.append(row);
    } else if (tried.size) {
      fb.append(el('b', '', 'Chưa đúng, chọn lại nhé'), el('span', '', it.hint));
    } else {
      fb.append(el('span', '', 'Chọn từ hợp với câu.'));
    }
    root.append(head, s, opts, fb, live);
  }

  function choose(o) {
    const it = items[i];
    if (o === it.answer) { solved = true; if (!tried.size) firstTry++; live.textContent = `Đúng rồi. ${it.explanation}`; }
    else { tried.add(o); live.textContent = `Chưa đúng. ${it.hint}`; }
    render();
    root.querySelector(solved ? '.btn-sticker' : '.q-opt:not(:disabled)')?.focus();
  }

  function done() {
    const d = el('div', 'q-done');
    const score = el('div', 'score');
    score.append(el('span', 'chip chip-green', `${firstTry}/${items.length} đúng ngay lần đầu`), el('span', 'chip chip-blue', items.map((x) => x.answer).join(' · ')));
    d.append(el('p', 'title', 'Xong phiên thử'), score,
      el('p', 'lead', 'Trong Wordmet, câu luyện là chính câu bạn đã lưu. Tạo tài khoản để lưu từ và giữ lịch ôn.'));
    const row = el('div', 'q-row');
    const go = el('a', 'btn btn-sticker btn-lg', 'Đăng ký miễn phí'); go.href = signupHref;
    const again = el('button', 'btn btn-quiet', 'Luyện lại'); again.type = 'button';
    again.addEventListener('click', () => { i = 0; firstTry = 0; tried = new Set(); solved = false; render(); });
    row.append(go, again); d.append(row);
    root.append(d, live);
  }

  root.addEventListener('keydown', (e) => {
    const n = Number(e.key);
    if (n >= 1 && n <= 4 && i < items.length && !solved) { const o = items[i].options[n - 1]; if (!tried.has(o)) choose(o); }
  });
  render();
}

// Tabs that swap a showcase panel (used by the "four tabs" mockup).
function mountTabs(root) {
  const tabs = [...root.querySelectorAll('[role=tab]')];
  const show = (t) => {
    tabs.forEach((x) => { const on = x === t; x.setAttribute('aria-selected', on); x.tabIndex = on ? 0 : -1;
      document.getElementById(x.getAttribute('aria-controls')).hidden = !on; });
  };
  tabs.forEach((t, k) => {
    t.addEventListener('click', () => show(t));
    t.addEventListener('keydown', (e) => {
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (d) { const n = tabs[(k + d + tabs.length) % tabs.length]; show(n); n.focus(); }
    });
  });
}

document.querySelectorAll('[data-practice]').forEach((r) => mountPractice(r));
document.querySelectorAll('[data-tabs]').forEach((r) => mountTabs(r));
