// adminkit — helpers for the admin wireframes on page 04. Prototypes 413:* live in the frame "Kit admin · mẫu" on page 01 Foundations. Run as new AsyncFunction('figma', code)(figma) → K.
const N = id => figma.getNodeByIdAsync(id);
await Promise.all(['Regular','SemiBold','Medium','ExtraBold'].map(s => figma.loadFontAsync({ family: 'Lexend', style: s })));
const vars = await figma.variables.getLocalVariablesAsync('COLOR');
const V = Object.fromEntries(vars.map(v => [v.name.replace('color/', ''), v]));
const resolve = async (v) => { let val = v.valuesByMode['2:0']; let guard = 0; while (val && val.type === 'VARIABLE_ALIAS' && guard++ < 5) { const t = await figma.variables.getVariableByIdAsync(val.id); val = t.valuesByMode[Object.keys(t.valuesByMode)[0]]; } return val; };
const RC = {}; for (const [k, v] of Object.entries(V)) RC[k] = await resolve(v);
const paint = (name) => { const c = RC[name]; return figma.variables.setBoundVariableForPaint({ type: 'SOLID', color: { r: c.r, g: c.g, b: c.b }, opacity: c.a ?? 1 }, 'color', V[name]); };
const P = {
  shell: await N('22:43'), head: await N('22:196'), panel: await N('413:478'), tablePanel: await N('22:201'),
  thead: await N('22:222'), thCell: await N('22:223'), row: await N('22:232'),
  bold: await N('22:203'), reg16: await N('22:235'), reg13: await N('22:206'), pill: await N('22:204'), link: await N('22:202'), th: await N('22:224'),
  title: await N('413:479'), desc: await N('413:481'), setting: await N('413:488'), settingUnit: await N('413:494'), switchRow: await N('413:501'), info: await N('413:507'),
  seg: await N('413:509'), label: await N('26:2174'), input: await N('26:2176'), select: await N('26:2181'), check: await N('26:2186'),
  dialog: await N('26:2171'), scrim: (await N('26:2117')).children.find(c => c.name === 'scrim'), btnSet: await N('3:71'),
};
const ICON = { search: '3:15', more: '3:28', close: '3:32', plus: '3:35', check: '3:38', lock: '3:42', 'chevron-down': '207:241', info: '207:249', history: '207:211', calendar: '207:264', 'circle-x': '207:254', 'circle-check': '207:258', 'rotate-ccw': '207:268', flag: '207:206', sliders: '207:238' };
const TONE = { success: ['success-soft', 'success'], warning: ['accent-soft', 'warning'], neutral: ['neutral-soft', 'muted'], info: ['primary-soft', 'primary'], danger: ['danger-soft', 'danger'], ink: ['ink', 'on-primary'] };
const K = {};
K.paint = paint;
K.frame = (parent, name, dir = 'VERTICAL', gap = 0, o = {}) => {
  const f = figma.createFrame(); f.name = name; f.fills = o.fill ? [paint(o.fill)] : []; f.layoutMode = dir; f.itemSpacing = gap;
  f.primaryAxisSizingMode = 'AUTO'; f.counterAxisSizingMode = 'AUTO'; f.clipsContent = false;
  if (o.pad != null) { const p = Array.isArray(o.pad) ? o.pad : [o.pad, o.pad]; f.paddingTop = f.paddingBottom = p[0]; f.paddingLeft = f.paddingRight = p[1]; }
  if (o.radius) f.cornerRadius = o.radius; if (o.stroke) { f.strokes = [paint(o.stroke)]; f.strokeWeight = 1; }
  if (o.align) f.counterAxisAlignItems = o.align; if (o.justify) f.primaryAxisAlignItems = o.justify; if (o.wrap) { f.layoutWrap = 'WRAP'; f.counterAxisSpacing = gap; }
  parent.appendChild(f); if (o.w === 'FILL') f.layoutSizingHorizontal = 'FILL'; else if (typeof o.w === 'number') { f.layoutSizingHorizontal = 'FIXED'; f.resize(o.w, f.height); }
  return f;
};
K.text = (parent, chars, kind = 'reg13', o = {}) => {
  const t = P[kind].clone(); parent.appendChild(t); t.characters = String(chars);
  if (o.color) t.fills = [paint(o.color)];
  if (o.w === 'FILL') { t.layoutSizingHorizontal = 'FILL'; t.textAutoResize = 'HEIGHT'; } else if (typeof o.w === 'number') { t.textAutoResize = 'HEIGHT'; t.layoutSizingHorizontal = 'FIXED'; t.resize(o.w, t.height); } else t.textAutoResize = 'WIDTH_AND_HEIGHT';
  if (o.mono) { t.fontName = { family: 'Lexend', style: 'Regular' }; t.fontSize = 12; }
  if (o.size) t.fontSize = o.size; if (o.name) t.name = o.name;
  return t;
};
K.btn = (parent, label, style = 'Quiet', size = 'Medium') => {
  const v = P.btnSet.children.find(c => c.name === `Style=${style}, Size=${size}`); const i = v.createInstance();
  const key = Object.keys(i.componentProperties).find(k => k.startsWith('Label')); if (key) i.setProperties({ [key]: label });
  i.name = (style === 'Sticker' ? 'cta ' : 'Button ') + label; parent.appendChild(i); try { i.layoutSizingHorizontal = 'HUG'; } catch (e) {} return i;
};
K.icon = async (parent, name, size = 18) => { const c = await N(ICON[name]); const i = c.createInstance(); i.resize(size, size); parent.appendChild(i); return i; };
K.pill = (parent, label, tone = 'neutral') => {
  const p = P.pill.clone(); parent.appendChild(p); p.name = 'status ' + label; const t = p.children[0]; t.characters = label;
  const [bg, fg] = TONE[tone]; p.fills = [paint(bg)]; t.fills = [paint(fg)]; return p;
};
K.shell = (o) => {
  const f = P.shell.clone(); (o.parent || figma.currentPage).appendChild(f); f.name = o.name; f.x = o.x ?? 0; f.y = o.y ?? 0;
  const h = o.h || 900; f.resize(1440, h);
  const sb = f.children.find(c => c.name === 'sidebar'); sb.resize(256, h);
  for (const n of sb.findAll(n => n.type === 'INSTANCE' && n.name.startsWith('nav '))) {
    const label = n.name.slice(4); const st = n.componentProperties.State.value;
    if (label === o.active) n.setProperties({ State: 'Active' }); else if (st === 'Active') n.setProperties({ State: 'Default' });
  }
  if (o.editor) {
    const hide = ['Lý do báo lỗi', 'Trả lượt', 'Người dùng', 'Tình trạng', 'Model', 'Thao tác', 'Prompt', 'Bộ ví dụ', 'Chi phí', 'Các lần gọi', 'Cài đặt hệ thống', 'Vai trò & staff'];
    for (const n of sb.findAll(n => n.type === 'INSTANCE' && n.name.startsWith('nav '))) if (hide.includes(n.name.slice(4))) n.visible = false;
    for (const g of sb.findAll(n => n.name === 'group AI' || n.name === 'group Hệ thống')) g.visible = false;
    const ft = sb.findAll(n => n.type === 'TEXT' && n.parent.name === 'foot'); if (ft[0]) ft[0].characters = 'lan.editor@wordmet.com'; if (ft[1]) ft[1].characters = 'editor';
  }
  const top = f.children.find(c => c.name === 'topbar'); top.findOne(n => n.type === 'TEXT').characters = o.title;
  const main = f.children.find(c => c.name === 'main'); for (const c of [...main.children]) c.remove();
  main.itemSpacing = 20; main.primaryAxisSizingMode = 'AUTO'; main.counterAxisAlignItems = 'MIN';
  return { f, main, sb };
};
K.head = (main, title, desc, buttons = []) => {
  const h = P.head.clone(); main.appendChild(h); h.layoutSizingHorizontal = 'FILL'; h.name = 'head'; h.clipsContent = false;
  const col = h.children[0]; col.children[0].characters = title; if (desc) { col.children[1].characters = desc; col.children[1].textAutoResize = 'HEIGHT'; } else col.children[1].remove();
  for (const c of [...h.children].slice(1)) c.remove();
  if (buttons.length) { const row = K.frame(h, 'nút', 'HORIZONTAL', 10, { align: 'CENTER' }); for (const [l, s] of buttons) K.btn(row, l, s || 'Quiet'); }
  h.counterAxisAlignItems = 'CENTER';
  return h;
};
K.panel = (parent, title, desc, o = {}) => {
  const p = P.panel.clone(); parent.appendChild(p); p.name = 'panel ' + (title || '');
  for (const c of [...p.children].slice(4)) c.remove();
  if (title) p.children[0].characters = title; else { p.children[0].remove(); p.children[0].remove(); }
  const d = p.children.find(c => c.type === 'TEXT' && c !== (title ? p.children[0] : null));
  if (desc && d) { d.characters = desc; d.textAutoResize = 'HEIGHT'; d.layoutSizingHorizontal = 'FILL'; } else if (d) { const i = p.children.indexOf(d); d.remove(); if (p.children[i]) p.children[i].remove(); }
  p.itemSpacing = o.gap ?? 0; p.primaryAxisSizingMode = 'AUTO';
  if (o.w === 'FILL' || o.w == null) p.layoutSizingHorizontal = 'FILL'; else { p.layoutSizingHorizontal = 'FIXED'; p.resize(o.w, p.height); }
  if (o.grow) p.layoutGrow = 1;
  return p;
};
// cols: [{h:'Email', w:220 | '*', bold?}], rows: [[cell,...]] cell: string | {pill, tone} | {link} | {lines:[a,b]} | {muted} | {bold} | {mono} | {btns:[[label,style]]}
K.table = (parent, cols, rows, o = {}) => {
  const tp = P.tablePanel.clone(); parent.appendChild(tp); tp.name = 'table ' + (o.name || ''); for (const c of [...tp.children]) c.remove();
  tp.layoutSizingHorizontal = 'FILL'; tp.primaryAxisSizingMode = 'AUTO';
  const th = P.thead.clone(); tp.appendChild(th); for (const c of [...th.children]) c.remove(); th.layoutSizingHorizontal = 'FILL';
  const cellFrame = (row, col) => { const c = P.thCell.clone(); row.appendChild(c); for (const k of [...c.children]) k.remove(); c.counterAxisSizingMode = 'AUTO'; c.primaryAxisSizingMode = 'FIXED';
    if (col.w === '*') { c.layoutGrow = 1; } else c.resize(col.w, c.height); c.counterAxisAlignItems = 'CENTER'; c.paddingRight = 10; return c; };
  for (const col of cols) { const c = cellFrame(th, col); if (col.h) K.text(c, col.h, 'th', { w: 'FILL' }); }
  const put = (c, v, col) => {
    if (v == null || v === '') return;
    if (typeof v === 'string' || typeof v === 'number') { K.text(c, v, col.bold ? 'bold' : 'reg13', { w: 'FILL', size: col.bold ? 14 : undefined }); return; }
    if (v.pill) { K.pill(c, v.pill, v.tone); return; }
    if (v.link) { K.text(c, v.link, 'link'); return; }
    if (v.bold) { K.text(c, v.bold, 'bold', { w: 'FILL', size: 14 }); return; }
    if (v.muted) { K.text(c, v.muted, 'reg13', { w: 'FILL', color: 'muted' }); return; }
    if (v.lines) { c.layoutMode = 'VERTICAL'; c.primaryAxisSizingMode = 'AUTO'; c.counterAxisSizingMode = 'FIXED'; if (col.w !== '*') c.resize(col.w, c.height); c.itemSpacing = 2; c.counterAxisAlignItems = 'MIN'; v.lines.forEach((l, i) => { if (typeof l === 'string') K.text(c, l, i === 0 && col.bold ? 'bold' : 'reg13', { w: 'FILL', size: i === 0 && col.bold ? 14 : undefined, color: i > 0 ? 'muted' : undefined }); else put(c, l, col); }); return; }
    if (v.btns) { c.itemSpacing = 6; for (const [l, s] of v.btns) K.btn(c, l, s || 'Quiet'); return; }
    if (v.check != null) { const b = K.frame(c, 'ô chọn', 'HORIZONTAL', 0, { radius: 5, stroke: v.check ? null : 'border-strong', fill: v.check ? 'primary' : null }); b.resize(18, 18); b.primaryAxisSizingMode = 'FIXED'; b.counterAxisSizingMode = 'FIXED'; return; }
  };
  rows.forEach((r, ri) => {
    const row = P.row.clone(); tp.appendChild(row); row.name = 'row ' + (typeof r[0] === 'string' ? r[0] : ri); for (const k of [...row.children]) k.remove();
    row.layoutSizingHorizontal = 'FILL'; row.counterAxisSizingMode = 'AUTO'; row.counterAxisAlignItems = 'CENTER'; row.paddingTop = row.paddingBottom = 10;
    if (o.highlight === ri) row.fills = [paint('primary-soft')];
    cols.forEach((col, ci) => put(cellFrame(row, col), r[ci], col));
  });
  if (o.foot) { const ft = K.frame(tp, 'chân bảng', 'HORIZONTAL', 12, { w: 'FILL', justify: 'SPACE_BETWEEN', align: 'CENTER' }); ft.paddingTop = 12; K.text(ft, o.foot, 'reg13', { color: 'muted' }); if (o.footBtn) K.btn(ft, o.footBtn, 'Quiet'); }
  return tp;
};
K.setting = (parent, label, sub, value, unit) => {
  const s = (unit ? P.settingUnit : P.setting).clone(); parent.appendChild(s); s.name = 'setting ' + label; s.layoutSizingHorizontal = 'FILL';
  const col = s.children[0]; col.children[0].characters = label; col.children[1].characters = sub; col.children[1].textAutoResize = 'HEIGHT'; col.layoutGrow = 1; col.layoutSizingHorizontal = 'FILL';
  const inp = s.children[1]; inp.children[0].characters = value; if (unit) inp.children[1].characters = unit;
  return s;
};
K.switchSetting = (parent, label, sub, on = true) => {
  const s = P.switchRow.clone(); parent.appendChild(s); s.name = 'setting ' + label; s.layoutSizingHorizontal = 'FILL';
  const col = s.children[0]; col.children[0].characters = label; col.children[1].characters = sub; col.children[1].textAutoResize = 'HEIGHT'; col.layoutGrow = 1; col.layoutSizingHorizontal = 'FILL';
  if (!on) { const sw = s.children[1]; sw.name = 'switch off'; sw.fills = [paint('border-strong')]; sw.children[0].x = 3; }
  return s;
};
K.info = (parent, text, tone) => { const i = P.info.clone(); parent.appendChild(i); i.layoutSizingHorizontal = 'FILL'; const t = i.children[0]; t.characters = text; t.layoutSizingHorizontal = 'FILL'; t.textAutoResize = 'HEIGHT'; if (tone && TONE[tone]) { i.fills = [paint(TONE[tone][0])]; t.fills = [paint(tone === 'warning' ? 'ink' : TONE[tone][1])]; } return i; };
K.seg = (parent, options, active = 0) => {
  const s = P.seg.clone(); parent.appendChild(s); s.name = 'tabs'; const on = P.seg.children[0], off = P.seg.children[1];
  for (const c of [...s.children]) c.remove();
  options.forEach((o, i) => { const c = (i === active ? on : off).clone(); s.appendChild(c); c.name = 'tab ' + o; c.children[0].characters = o; });
  return s;
};
K.field = (parent, label, value, o = {}) => {
  const f = K.frame(parent, 'field ' + label, 'VERTICAL', 5, { w: o.w ?? 'FILL' }); if (label) K.text(f, label, 'label', { w: 'FILL' });
  const inp = (o.select ? P.select : P.input).clone(); f.appendChild(inp); inp.layoutSizingHorizontal = 'FILL'; inp.name = (o.select ? 'select ' : 'input ') + label;
  const t = inp.children[0]; t.characters = value; t.layoutGrow = 1; t.layoutSizingHorizontal = 'FILL';
  if (o.placeholder) t.fills = [paint('placeholder')];
  if (o.h) { inp.layoutSizingVertical = 'FIXED'; inp.resize(inp.width, o.h); inp.counterAxisAlignItems = 'MIN'; inp.paddingTop = 10; t.textAutoResize = 'HEIGHT'; }
  if (o.sub) K.text(f, o.sub, 'reg13', { w: 'FILL', color: 'muted' });
  return f;
};
K.check = (parent, label, checked = true) => {
  const c = P.check.clone(); parent.appendChild(c); c.name = 'check ' + label; c.children[1].characters = label;
  if (!checked) { const b = c.children[0]; b.fills = [paint('surface')]; b.strokes = [paint('border-strong')]; b.strokeWeight = 1.5; for (const k of [...b.children]) k.remove(); }
  return c;
};
K.radio = (parent, label, on) => {
  const r = K.frame(parent, 'radio ' + label, 'HORIZONTAL', 8, { align: 'CENTER' });
  const dot = figma.createEllipse(); r.appendChild(dot); dot.resize(18, 18); dot.fills = on ? [paint('primary')] : [paint('surface')]; dot.strokes = [paint(on ? 'primary' : 'border-strong')]; dot.strokeWeight = on ? 5 : 1.5;
  K.text(r, label, 'reg16'); return r;
};
K.dialog = (f, title, w = 520) => {
  const s = P.scrim.clone(); f.appendChild(s); s.resize(f.width, f.height); s.x = 0; s.y = 0;
  const d = P.dialog.clone(); f.appendChild(d); d.name = 'dialog ' + title; for (const c of [...d.children].slice(1)) c.remove(); d.children[0].characters = title;
  d.children[0].textAutoResize = 'HEIGHT'; d.children[0].layoutSizingHorizontal = 'FILL'; d.itemSpacing = 14; d.resize(w, d.height); d.primaryAxisSizingMode = 'AUTO';
  return d;
};
K.place = (d, f) => { d.x = Math.round((f.width - d.width) / 2); d.y = Math.round(Math.max(40, (f.height - d.height) / 2)); };
K.fit = (f) => { const main = f.children.find(c => c.name === 'main'); const h = Math.max(900, Math.ceil(main.y + main.height + 40)); f.resize(1440, h); const sb = f.children.find(c => c.name === 'sidebar'); sb.resize(256, h); for (const s of f.children.filter(c => c.name === 'scrim')) s.resize(1440, h); return h; };
K.row = (parent, gap = 20, o = {}) => K.frame(parent, o.name || 'hàng', 'HORIZONTAL', gap, { w: 'FILL', align: o.align || 'MIN', ...o });
K.col = (parent, gap = 20, o = {}) => K.frame(parent, o.name || 'cột', 'VERTICAL', gap, o);
K.checks = async (ids) => { const AF = Object.getPrototypeOf(async function () {}).constructor; const r = await new AF('figma', 'FRAME_IDS', figma.root.getSharedPluginData('wordmet', 'checks'))(figma, ids); return r.map(z => `${z.frame.slice(0, 8)} txt ${z.minTextContrast} icon ${z.minIconContrast} ovf ${z.overflowCount} yel ${z.yellowButtonCount} ledge ${z.ledgeClipped} ${z.worst.slice(0, 3).join(';')}`); };
return K;
