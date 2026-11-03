// The exercise gallery for mockup 5: one live question card per exercise type, built like the app's practice session
// (QuestionCard, Choices, TypeWordInput, AnswerFeedback). Labels and prompts are the app's own strings in
// apps/web/messages/vi.json (App.practice.session.kind / ask); the words and sentences are sample content.
const EXERCISES = [
  { id: 'mcq', kind: 'Trắc nghiệm', ask: 'Chọn từ có nghĩa này', plan: 'free', title: 'triển khai, phát hành', label: 'phần mềm',
    options: ['deploy', 'delay', 'deliver', 'decide'], right: 0, lemma: 'deploy', meaning: 'triển khai, phát hành' },
  { id: 'tf', kind: 'Đúng/sai', ask: 'Từ và nghĩa này có khớp không?', plan: 'free', title: 'borrow', sub: 'cho mượn',
    options: ['Đúng', 'Sai'], right: 1, lemma: 'borrow', meaning: 'mượn (dùng rồi trả); “cho mượn” là lend' },
  { id: 'type', kind: 'Gõ từ · theo nghĩa', ask: 'Gõ từ tiếng Anh có nghĩa này', plan: 'free', title: 'cho rằng, mặc định là đúng',
    answer: 'assume', hint: 'Chữ cái đầu: a… · 6 chữ', lemma: 'assume', meaning: 'cho rằng' },
  { id: 'saved', kind: 'Điền từ vào câu', ask: 'Gõ từ còn thiếu, đúng dạng trong câu', plan: 'free', source: 'Câu bạn đã lưu',
    sentence: ['Can I', 'your charger for a minute?'], answer: 'borrow', hint: 'Chữ cái đầu: b… · 6 chữ', lemma: 'borrow', meaning: 'mượn' },
  { id: 'ai-cloze', kind: 'Điền từ vào câu', ai: true, ask: 'Gõ từ còn thiếu, đúng dạng trong câu', plan: 'pro',
    sentence: ['The team', 'the fix last night.'], answer: 'deployed', hint: 'Chữ cái đầu: d… · 8 chữ', lemma: 'deploy', meaning: 'triển khai',
    translation: 'Nhóm đã triển khai bản sửa lỗi tối qua.' },
  { id: 'ai-meaning', kind: 'Chọn nghĩa trong câu', ai: true, ask: 'Từ in đậm trong câu này nghĩa là gì?', plan: 'pro',
    sentence: "Don't assume everyone has read the email.", bold: 'assume', options: ['cho rằng', 'đảm nhận', 'giả vờ', 'đảm bảo'], right: 0,
    lemma: 'assume', meaning: 'cho rằng (khi chưa kiểm chứng)', translation: 'Đừng cho rằng ai cũng đã đọc email.' },
  { id: 'ai-mcq', kind: 'Trắc nghiệm theo câu', ai: true, ask: 'Chọn từ điền vào chỗ trống', plan: 'pro',
    sentence: ['Could you', 'me your pen for a second?'], options: ['lend', 'borrow', 'rent', 'owe'], right: 0, lemma: 'lend', meaning: 'cho mượn',
    translation: 'Bạn cho mình mượn cây bút một chút được không?' },
];

const SVG = (id) => `<svg class="ic" aria-hidden="true"><use href="#${id}"/></svg>`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function mountExercises(root) {
  const list = root.querySelector('[data-ex-list]');
  const stage = root.querySelector('[data-ex-stage]');
  const live = root.querySelector('[data-ex-live]');
  let current = 0;

  list.innerHTML = EXERCISES.map((e, i) => `
    <li><button type="button" class="ex-pick" data-i="${i}" aria-pressed="${i === 0}">
      <span class="ex-name">${esc(e.kind)}${e.ai ? ' <span class="qc-ai">Câu AI</span>' : ''}</span>
      <span class="chip ${e.plan === 'pro' ? 'chip-blue' : 'chip-green'}">${e.plan === 'pro' ? 'Pro' : 'Miễn phí'}</span>
    </button></li>`).join('');
  list.addEventListener('click', (ev) => { const b = ev.target.closest('.ex-pick'); if (b) show(Number(b.dataset.i)); });

  function show(i) {
    current = i;
    list.querySelectorAll('.ex-pick').forEach((b, k) => b.setAttribute('aria-pressed', String(k === i)));
    render({ answered: false });
  }

  // Owner 03/11/2026: the landing card keeps only the type chips; no instruction line, no report link.
  function head(e) {
    return `<div class="qc-top"><div class="qc-tags">${e.ai ? '<span class="qc-ai">Câu AI</span>' : ''}<span class="qc-kind">${esc(e.kind)}</span></div></div>`;
  }

  function prompt(e, filled) {
    if (e.title) return `<div class="qc-title"><b${e.id === 'tf' ? ' lang="en"' : ''}>${esc(e.title)}</b>${e.label ? `<span class="qc-label">${esc(e.label)}</span>` : ''}</div>${e.sub ? `<p class="qc-sub">${esc(e.sub)}</p>` : ''}`;
    const src = e.source ? `<span class="chip chip-soft" style="justify-self:start">${esc(e.source)}</span>` : '';
    if (typeof e.sentence === 'string') {
      const at = e.sentence.indexOf(e.bold);
      return `${src}<p class="qc-sentence" lang="en">${esc(e.sentence.slice(0, at))}<strong>${esc(e.bold)}</strong>${esc(e.sentence.slice(at + e.bold.length))}</p>`;
    }
    const gap = filled ? `<strong>${esc(filled)}</strong>` : '<span class="blank" aria-label="chỗ trống"></span>';
    return `${src}<p class="qc-sentence" lang="en">${esc(e.sentence[0])} ${gap} ${esc(e.sentence[1])}</p>`;
  }

  // Owner 03/11/2026: no right/wrong box; the colours on the answer say it, then two buttons.
  function feedback() {
    return `<div class="qc-actions"><button type="button" class="btn btn-quiet" data-act="again">Làm lại</button><button type="button" class="btn btn-sticker" data-act="next">Dạng bài tiếp theo <kbd>Enter</kbd></button></div>`;
  }

  function render(state) {
    const e = EXERCISES[current];
    let body = '';
    if (e.options) {
      body = `<div class="qc-choices">${e.options.map((o, k) => {
        const right = state.answered && k === e.right, chosen = state.answered && k === state.chosen;
        const cls = right ? 'right' : chosen ? 'chosen' : '';
        const verdict = right ? `<span class="verdict">${SVG('i-check-circle')}</span>` : chosen ? `<span class="verdict">${SVG('i-x-circle')}</span>` : '';
        const lang = /^[a-z]+$/.test(o) ? ' lang="en"' : '';
        return `<button type="button" class="qc-choice ${cls}" data-k="${k}" ${state.answered ? 'disabled' : ''}><span class="n">${k + 1}</span><span class="t"${lang}>${esc(o)}</span>${verdict}</button>`;
      }).join('')}</div>`;
      if (state.answered) body += feedback();
    } else {
      const retry = state.tries > 0 && !state.answered;
      const shown = state.answered ? (state.ok ? state.text : e.answer) : (state.text ?? '');
      const cls = state.answered ? (state.ok ? 'right' : 'revealed') : retry ? 'retry' : '';
      body = `<form class="qc-type" data-type><div class="field"><label class="sr-only" for="ex-in">Câu trả lời</label>
        <input id="ex-in" lang="en" autocomplete="off" autocapitalize="none" spellcheck="false" maxlength="100" placeholder="Gõ từ tiếng Anh" value="${esc(shown)}" class="${cls}" ${state.answered ? 'readonly' : ''}>
        ${retry ? `<span class="attempt">Lần ${state.tries}</span>` : ''}</div>
        ${state.answered ? '' : `<button type="submit" class="btn btn-sticker btn-lg">Kiểm tra</button>`}</form>`;
      if (retry) body += `${state.hint ? `<p class="qc-note">${esc(e.hint)}</p>` : ''}
        <div class="qc-actions"><button type="button" class="btn btn-quiet" data-act="hint" ${state.hint ? 'disabled' : ''}>Gợi ý <kbd>H</kbd></button><button type="button" class="btn btn-quiet" data-act="reveal">Xem đáp án</button></div>`;
      if (state.answered) body += feedback();
    }
    const filled = state.answered && !e.options && e.sentence && typeof e.sentence !== 'string' ? (state.ok ? state.text : e.answer) : null;
    stage.innerHTML = `<section class="qc" aria-label="${esc(e.kind)}">${head(e)}${prompt(e, filled)}${body}</section>`;
    wire(e, state);
  }

  function wire(e, state) {
    stage.querySelectorAll('.qc-choice').forEach((b) => b.addEventListener('click', () => {
      const k = Number(b.dataset.k);
      live.textContent = k === e.right ? `Đúng rồi. ${e.lemma}, ${e.meaning}.` : `Chưa đúng. Đáp án là ${e.options[e.right]}.`;
      render({ answered: true, chosen: k });
      stage.querySelector('[data-act=next]')?.focus();
    }));
    const form = stage.querySelector('[data-type]');
    if (form) {
      const input = form.querySelector('input');
      form.addEventListener('submit', (ev) => {
        ev.preventDefault();
        const text = input.value.trim();
        if (!text) return;
        if (text.toLowerCase() === e.answer) { live.textContent = `Đúng rồi. ${e.lemma}, ${e.meaning}.`; render({ answered: true, ok: true, text }); stage.querySelector('[data-act=next]')?.focus(); }
        else { live.textContent = 'Chưa đúng. Kiểm tra chính tả rồi gõ lại.'; render({ answered: false, tries: (state.tries ?? 0) + 1, text, hint: state.hint }); const f = stage.querySelector('input'); f.focus(); f.select(); }
      });
    }
    stage.querySelector('[data-act=hint]')?.addEventListener('click', () => render({ ...state, hint: true }));
    stage.querySelector('[data-act=reveal]')?.addEventListener('click', () => { render({ answered: true, ok: false, text: state.text }); stage.querySelector('[data-act=next]')?.focus(); });
    stage.querySelector('[data-act=again]')?.addEventListener('click', () => render({ answered: false }));
    stage.querySelector('[data-act=next]')?.addEventListener('click', () => { show((current + 1) % EXERCISES.length); list.querySelectorAll('.ex-pick')[current].focus(); });
  }

  show(0);
}

document.querySelectorAll('[data-exercises]').forEach(mountExercises);
