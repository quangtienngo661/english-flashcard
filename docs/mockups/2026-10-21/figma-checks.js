// Kiểm mỗi mốc của đợt giao diện (plan Task 2). Chạy qua use_figma trong file 7HcPAKLrWu32C27qYMJUOA.
// Cách dùng: thay mảng FRAME_IDS bằng id các khung cần kiểm (cùng một page), dán cả file làm `code` của use_figma.
// Bản đã lưu trong file Figma (21/10/2026, shared plugin data `wordmet` / `checks`, thân script không có dòng FRAME_IDS) chạy bằng:
//   const AF = Object.getPrototypeOf(async function(){}).constructor;
//   return await new AF('figma', 'FRAME_IDS', figma.root.getSharedPluginData('wordmet', 'checks'))(figma, ['<id>', …]);
// Sửa file này thì lưu lại bản trong Figma (figma.root.setSharedPluginData('wordmet', 'checks', <thân script>)).
// Đối chứng 21/10/2026: K/10, M/10 → minTextContrast 5,61, overflowCount 0; khung nháp chữ xám trên nền xám → 1,77 và 1 chữ tràn.
// Trả về mỗi khung: { frame, ledgeClipped, minTextContrast, minIconContrast, overflowCount, yellowButtonCount, exemptedTexts, worst }.
// Ngưỡng của plan: minTextContrast >= 4.5, minIconContrast >= 3, overflowCount = 0, yellowButtonCount <= 1; thêm 22/10: ledgeClipped = 0.
const FRAME_IDS = ['REPLACE_ME'];

const lum = c => { const f = v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)); return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const blend = (fg, a, bg) => ({ r: fg.r * a + bg.r * (1 - a), g: fg.g * a + bg.g * (1 - a), b: fg.b * a + bg.b * (1 - a) });
const varCache = new Map();
async function paintColor(node, paint, idx, prop) {
  // Màu của một paint SOLID, theo mode của chính node (đúng cả với khung đặt mode Dark).
  const bound = node.boundVariables && node.boundVariables[prop] && node.boundVariables[prop][idx];
  if (bound) {
    let v = varCache.get(bound.id);
    if (!v) { v = await figma.variables.getVariableByIdAsync(bound.id); varCache.set(bound.id, v); }
    const r = v && v.resolveForConsumer(node);
    if (r && r.value && 'r' in r.value) return { c: { r: r.value.r, g: r.value.g, b: r.value.b }, a: (r.value.a === undefined ? 1 : r.value.a) * (paint.opacity === undefined ? 1 : paint.opacity) };
  }
  return { c: paint.color, a: paint.opacity === undefined ? 1 : paint.opacity };
}
async function solidFill(node, prop = 'fills') {
  const ps = node[prop];
  if (!Array.isArray(ps)) return null;
  for (let i = ps.length - 1; i >= 0; i--) { const p = ps[i]; if (p.type === 'SOLID' && p.visible !== false) return paintColor(node, p, i, prop); }
  return null;
}
const box = n => n.absoluteBoundingBox; // absoluteRenderBounds bị cắt theo khung cha, không dùng để đo tràn
const contains = (o, i, t = 0.5) => o && i && i.x >= o.x - t && i.y >= o.y - t && i.x + i.width <= o.x + o.width + t && i.y + i.height <= o.y + o.height + t;
const hit = (b, p) => b && p.x >= b.x && p.x <= b.x + b.width && p.y >= b.y && p.y <= b.y + b.height;
async function topFillAt(node, pt) {
  // Lớp có màu đặc nằm trên cùng tại điểm pt trong cây con của node (con vẽ sau nằm trên).
  if (node.visible === false || !hit(node.absoluteBoundingBox, pt)) return null;
  if ('children' in node) for (let i = node.children.length - 1; i >= 0; i--) { const r = await topFillAt(node.children[i], pt); if (r) return r; }
  if ('fills' in node) { const f = await solidFill(node); if (f && f.a > 0) return { ...f, a: f.a * (node.opacity === undefined ? 1 : node.opacity) }; }
  return null;
}
async function background(node, top) {
  // Màu nền thật sau node: lớp đặc gần nhất nằm dưới node (cây con của anh em vẽ trước, rồi cha), trộn lớp mờ lên trên.
  const b = box(node); const pt = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  const stack = [];
  let cur = node;
  while (cur && cur !== top.parent) {
    const parent = cur.parent;
    if (parent && 'children' in parent) {
      const sibs = parent.children; const idx = sibs.indexOf(cur);
      for (let i = idx - 1; i >= 0; i--) {
        const f = await topFillAt(sibs[i], pt);
        if (f) { stack.push(f); if (f.a >= 0.99) return compose(stack); }
      }
    }
    if (parent && parent.type !== 'PAGE' && parent.type !== 'SECTION' && 'fills' in parent) {
      const f = await solidFill(parent); if (f) { stack.push(f); if (f.a >= 0.99) return compose(stack); }
    }
    if (cur === top) break;
    cur = parent;
  }
  stack.push({ c: { r: 1, g: 1, b: 1 }, a: 1 });
  return compose(stack);
}
function compose(stack) { let c = stack[stack.length - 1].c; for (let i = stack.length - 2; i >= 0; i--) c = blend(stack[i].c, stack[i].a, c); return c; }
function opacityChain(node, top) { let o = 1, n = node; while (n && n !== top.parent) { o *= n.opacity === undefined ? 1 : n.opacity; if (n === top) break; n = n.parent; } return o; }
// Phần tử cố ý làm mờ (đang tắt) được miễn ngưỡng tương phản (WCAG 1.4.3: thành phần không hoạt động); vẫn đếm tràn chữ.
function exempt(node, top) { let n = node; while (n && n !== top) { if (/(disabled|\(mờ\)|tắt tới khi)/i.test(n.name || '')) return true; n = n.parent; } return false; }
function visibleChain(node, top) { let n = node; while (n && n !== top.parent) { if (n.visible === false) return false; if (n === top) break; n = n.parent; } return true; }

{ let pg = await figma.getNodeByIdAsync(FRAME_IDS[0]); while (pg && pg.type !== 'PAGE') pg = pg.parent; if (pg) await figma.setCurrentPageAsync(pg); }
const results = [];
for (const id of FRAME_IDS) {
  const top = await figma.getNodeByIdAsync(id);
  if (!top) { results.push({ frame: id, error: 'not found' }); continue; }
  const topBox = top.absoluteBoundingBox;
  let minText = 99, minIcon = 99, overflow = 0, yellow = 0, exempted = 0; const worst = [];
  const texts = top.findAllWithCriteria({ types: ['TEXT'] }).filter(t => visibleChain(t, top) && t.characters.trim());
  for (const t of texts) {
    const f = await solidFill(t); if (!f) continue;
    const bg = await background(t, top);
    const fg = blend(f.c, f.a * opacityChain(t, top), bg);
    const r = ratio(fg, bg);
    if (exempt(t, top)) exempted++;
    else { if (r < minText) minText = r; if (r < 4.5) worst.push(`text ${t.id} "${t.characters.slice(0, 30)}" ${r.toFixed(2)}`); }
    // Tràn = chữ ra ngoài khối chứa nó (cha gần nhất có nền, viền hoặc cắt nội dung: thẻ, nút, chip, hộp); chữ nằm thẳng trong khung màn thì
    // không được vượt mép trái/phải. Nội dung dưới mép dưới khung màn là phần cuộn, không tính.
    const tb = box(t);
    let holder = null, p = t.parent;
    while (p && p !== top) { if (p.clipsContent || (Array.isArray(p.fills) && p.fills.some(x => x.visible !== false)) || (Array.isArray(p.strokes) && p.strokes.length)) { holder = p.absoluteBoundingBox; break; } p = p.parent; }
    const outX = tb.x < topBox.x - 0.5 || tb.x + tb.width > topBox.x + topBox.width + 0.5;
    const own = t.textAutoResize === 'NONE' && t.absoluteRenderBounds && t.absoluteRenderBounds.height > t.height + 1; // chữ tràn khỏi ô cao cố định
    if ((holder ? !contains(holder, tb) : outX) || own) { overflow++; worst.push(`overflow ${t.id} "${t.characters.slice(0, 30)}"`); }
  }
  // Nút (Button, cta, btn, nút) không được tràn khỏi khối chứa nó, hay vượt mép trái/phải khung màn.
  for (const bt of top.findAll(n => visibleChain(n, top) && (n.type === 'INSTANCE' || n.type === 'FRAME') && /^(cta|btn|nút |Button)/i.test(n.name))) {
    let h = null, p = bt.parent;
    while (p && p !== top) { if (p.clipsContent || (Array.isArray(p.fills) && p.fills.some(x => x.visible !== false))) { h = p.absoluteBoundingBox; break; } p = p.parent; }
    const bb = bt.absoluteBoundingBox;
    if ((h && !contains(h, bb)) || (!h && (bb.x < topBox.x - 0.5 || bb.x + bb.width > topBox.x + topBox.width + 0.5))) { overflow++; worst.push(`overflow nút ${bt.id} "${bt.name.slice(0, 24)}"`); }
  }
  const icons = top.findAllWithCriteria({ types: ['INSTANCE'] }).filter(i => visibleChain(i, top) && /^icon\//.test(i.name || ''));
  for (const ic of icons) {
    const vecs = ic.findAll(n => n.visible !== false && 'strokes' in n && n.strokes.length);
    for (const v of vecs.slice(0, 1)) {
      const s = await solidFill(v, 'strokes'); if (!s) continue;
      const bg = await background(ic, top);
      const r = ratio(blend(s.c, s.a * opacityChain(v, top), bg), bg);
      if (r < minIcon) minIcon = r;
      if (r < 3) worst.push(`icon ${ic.id} ${ic.name} ${r.toFixed(2)}`);
    }
  }
  // Nút vàng nằm dưới lớp phủ (scrim) của hộp thoại là nền mờ, không tính.
  const scrimIdx = top.children.findIndex(c => /scrim/i.test(c.name) && c.visible !== false);
  const topIdx = n => { let p = n; while (p.parent !== top) p = p.parent; return top.children.indexOf(p); };
  for (const n of top.findAll(n => visibleChain(n, top) && (n.type === 'INSTANCE' || n.type === 'FRAME') && (scrimIdx < 0 || topIdx(n) > scrimIdx))) {
    if (n.type === 'INSTANCE' && n.componentProperties && n.componentProperties.Style && n.componentProperties.Style.value === 'Sticker') { yellow++; continue; }
    // Nút tự vẽ đặt tên "btn …" / "cta …" / "nút …"; tab đang mở tô vàng ở thanh trên không phải nút.
    if (n.type === 'FRAME' && /^(btn|cta|nút|button)\b/i.test(n.name) && n.height >= 32 && n.height <= 72) {
      const f = await solidFill(n);
      if (f && f.a > 0.99 && Math.abs(f.c.r - 1) < 0.02 && Math.abs(f.c.g - 0.847) < 0.02 && Math.abs(f.c.b - 0.29) < 0.03) yellow++;
    }
  }
  // Gờ đặc của nút (bóng đổ đặc lệch xuống) không được bị khung cha cắt mất.
  let ledgeClipped = 0;
  for (const x of top.findAll(n => visibleChain(n, top) && (n.type === 'INSTANCE' || n.type === 'FRAME') && Array.isArray(n.effects) && n.effects.some(e => e.type === 'DROP_SHADOW' && e.visible !== false && e.offset.y > 0 && e.radius === 0) && n.height <= 72)) {
    const xb = x.absoluteBoundingBox; const need = xb.y + xb.height + Math.max(...x.effects.filter(e => e.type === 'DROP_SHADOW').map(e => e.offset.y + e.spread));
    for (let p = x.parent; p && p !== top.parent; p = p.parent) { const pb = p.absoluteBoundingBox; if (pb.y + pb.height >= need) break; if (p.clipsContent) { ledgeClipped++; worst.push(`ledge ${x.id} "${x.name.slice(0, 24)}" cắt bởi ${p.name.slice(0, 24)}`); break; } }
  }
  results.push({ frame: `${top.name} ${id}`, ledgeClipped, minTextContrast: +minText.toFixed(2), minIconContrast: minIcon === 99 ? null : +minIcon.toFixed(2), overflowCount: overflow, yellowButtonCount: yellow, exemptedTexts: exempted, worst: worst.slice(0, 8) });
}
return results;
