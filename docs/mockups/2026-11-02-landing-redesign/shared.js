// Shared by the three landing mockups (02/11/2026): the practice card data and its behaviour.
// Sentences, options, hints, explanations and translations come from apps/web/messages/vi.json (namespace Cloze);
// the "source" lines are demonstration data, labelled as an example on the page.
const CLOZE_ITEMS = [
  {
    id: 'borrow', source: 'Câu trong phim', before: 'Can I', answer: 'borrow', after: 'your charger for a minute?',
    options: ['borrow', 'lend', 'rent', 'owe'],
    hint: 'Gợi ý: hỏi xin dùng tạm đồ của người khác.',
    explanation: 'borrow = mượn (dùng rồi trả). Khác lend = cho mượn.',
    translation: '“Cho mình mượn cục sạc một chút được không?”',
  },
  {
    id: 'assume', source: 'Câu trong email', before: "Don't", answer: 'assume', after: 'that everyone has read the email.',
    options: ['assume', 'resume', 'consume', 'assure'],
    hint: 'Gợi ý: cho là đúng khi chưa kiểm chứng.',
    explanation: 'assume = cho rằng, mặc định là đúng (khi chưa xác minh).',
    translation: '“Đừng mặc định rằng ai cũng đã đọc email.”',
  },
  {
    id: 'deploy', source: 'Câu trong tin nhắn công việc', before: 'We plan to', answer: 'deploy', after: 'the new version on Friday.',
    options: ['deploy', 'delay', 'deliver', 'decide'],
    hint: 'Gợi ý: đưa phiên bản phần mềm tới người dùng.',
    explanation: 'deploy = triển khai, phát hành (phần mềm, hệ thống).',
    translation: '“Bọn mình dự kiến triển khai bản mới vào thứ Sáu.”',
  },
];

// Renders the practice card into `root`. Class names are shared; each mockup styles them its own way.
function mountCloze(root, { ctaHref = '#dang-ky' } = {}) {
  let index = 0;
  let tried = new Set();
  let solved = false;

  const live = document.createElement('p');
  live.className = 'sr-only';
  live.setAttribute('aria-live', 'polite');

  function render() {
    root.replaceChildren();
    if (index >= CLOZE_ITEMS.length) return renderDone();
    const item = CLOZE_ITEMS[index];

    const head = el('div', 'cz-head');
    head.append(el('span', 'cz-count', `Câu ${index + 1}/${CLOZE_ITEMS.length}`), el('span', 'cz-source', `Ví dụ · ${item.source}`));

    const sentence = el('p', 'cz-sentence');
    sentence.lang = 'en';
    const blank = el('span', 'cz-blank' + (solved ? ' is-right' : ''), solved ? item.answer : ' '.repeat(10));
    sentence.append(`${item.before} `, blank, ` ${item.after}`);

    const options = el('div', 'cz-options');
    options.setAttribute('role', 'group');
    options.setAttribute('aria-label', 'Chọn từ điền vào chỗ trống');
    for (const opt of item.options) {
      const b = el('button', 'cz-opt', opt);
      b.type = 'button';
      b.lang = 'en';
      if (tried.has(opt)) b.classList.add('is-wrong');
      if (solved && opt === item.answer) b.classList.add('is-right');
      b.disabled = solved || tried.has(opt);
      b.addEventListener('click', () => choose(opt));
      options.append(b);
    }

    const feedback = el('div', 'cz-feedback');
    if (solved) {
      feedback.classList.add('is-right');
      feedback.append(el('p', 'cz-title', 'Đúng rồi'), el('p', 'cz-explain', item.explanation), el('p', 'cz-translate', item.translation));
      const next = el('button', 'cz-next', index + 1 < CLOZE_ITEMS.length ? 'Câu tiếp' : 'Xem kết quả');
      next.type = 'button';
      next.addEventListener('click', () => { index += 1; tried = new Set(); solved = false; render(); root.querySelector('button')?.focus(); });
      feedback.append(next);
    } else if (tried.size) {
      feedback.classList.add('is-wrong');
      feedback.append(el('p', 'cz-title', 'Chưa đúng, chọn lại nhé'), el('p', 'cz-explain', item.hint));
    } else {
      feedback.append(el('p', 'cz-explain', 'Chọn từ hợp với câu.'));
    }

    root.append(head, sentence, options, feedback, live);
  }

  function choose(opt) {
    const item = CLOZE_ITEMS[index];
    if (opt === item.answer) { solved = true; live.textContent = `Đúng rồi. ${item.explanation}`; }
    else { tried.add(opt); live.textContent = `Chưa đúng. ${item.hint}`; }
    render();
    root.querySelector(solved ? '.cz-next' : '.cz-opt:not(:disabled)')?.focus();
  }

  function renderDone() {
    const done = el('div', 'cz-done');
    done.append(
      el('p', 'cz-title', 'Xong 3 câu mẫu'),
      el('p', 'cz-explain', 'Trong Wordmet, câu luyện là chính câu bạn đã lưu khi gặp từ.'),
    );
    const row = el('div', 'cz-done-row');
    const cta = el('a', 'cz-next', 'Đăng ký nhận tin ra mắt');
    cta.href = ctaHref;
    const again = el('button', 'cz-again', 'Luyện lại');
    again.type = 'button';
    again.addEventListener('click', () => { index = 0; tried = new Set(); solved = false; render(); });
    row.append(cta, again);
    done.append(row);
    root.append(done, live);
  }

  render();
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// The waitlist form only shows its states in a mockup: nothing is sent anywhere.
function mountWaitlist(form) {
  const msg = form.querySelector('.wl-msg');
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const email = form.querySelector('input[type=email]');
    const consent = form.querySelector('input[type=checkbox]');
    msg.className = 'wl-msg';
    if (!/^\S+@\S+\.\S+$/.test(email.value)) { msg.textContent = 'Email chưa đúng dạng. Kiểm tra lại, ví dụ ten@gmail.com.'; msg.classList.add('is-error'); email.focus(); return; }
    if (!consent.checked) { msg.textContent = 'Bạn cần đồng ý với Chính sách bảo mật để đăng ký.'; msg.classList.add('is-error'); consent.focus(); return; }
    msg.textContent = 'Đã đăng ký. Wordmet sẽ gửi email cho bạn khi mở cửa. (Mockup: không gửi gì đi.)';
    msg.classList.add('is-ok');
  });
}

document.querySelectorAll('[data-cloze]').forEach((root) => mountCloze(root));
document.querySelectorAll('form[data-waitlist]').forEach((form) => mountWaitlist(form));
