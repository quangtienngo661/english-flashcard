# Design System: Wordmet review deck (card stack)

Written for Google Stitch from the prototype `chong-the.html` (07/11/2026). English for the tool; every UI string is
the Vietnamese copy the app already uses (`apps/web/messages/vi.json`, `App.review`). Not decided by the owner yet.

## 1. Visual Theme & Atmosphere

A focused, tactile study screen built from one shape: the card. The learner holds a deck; the screen is a large
index-divider card in biro blue with a tab carrying the deck name ("Kinh doanh · A2"), and the vocabulary cards sit
on it in a short stack. Density 3 ("Art Gallery Airy": one card, two piles, three buttons). Variance 5 (left and
right piles mirror each other; the tab breaks the top-left corner). Motion 7 ("Fluid, physical"): the card follows
the hand, tilts, flies into a pile, and the next card rises.

## 2. Color Palette & Roles

- **Sheet White** (#FFFFFF) — page ground, card faces, enabled answer buttons, summary panels
- **Pale Tray** (#F4F4F4) — inner fields on a card (example sentence block, form chips, speak button)
- **Desk Ink** (#111111) — all text on white; the flip button fill
- **Pencil Grey** (#5E5E5E) — secondary text: part of speech, field labels, stage line
- **Biro Blue** (#1A4BE0) — the one accent: the study stage and its tab, the highlighted word in sentences, the "Ưu tiên" badge
- **Deep Biro** (#143AAE) — empty pile slots and disabled answer buttons on the stage
- **Stage Mist** (#D6E0FB) — secondary text on the blue stage
- **Known Green** (#14713A) / soft (#DEF2E4) — "Đã biết" only: its pile when armed, its stamp, its progress tick
- **Again Rust** (#A6450A) / soft (#FBE8DA) — "Cần ôn lại" only: its pile when armed, its stamp, its progress tick, the "Lâu chưa ôn" badge
- **Card Behind 1** (#ECECEC), **Card Behind 2** (#DCDCDC) — the cards under the top one; tone steps, never shadows

Green and rust are answer colours, not accents: they appear only where an answer is shown.

## 3. Typography Rules

- **One family:** Bricolage Grotesque (variable, optical size on). Has the Vietnamese subset; checked 05/11/2026.
- **Display:** the word on the card front, 44–62px, weight 600, tracking -0.045em, leading 1.
- **Meaning:** 32px (27px on phones), weight 600, tracking -0.03em.
- **Body:** 17px, leading 1.4–1.5. Small: 14px for labels and hints. Five sizes in all: 14, 17, 22, 32, 62.
- Key hints (Space, 1, 2, Esc, Enter) are set in the same family on a tone chip; no monospace.
- Banned: Inter, monospace labels, uppercase letter-spaced labels.

## 4. Component Stylings

- **Card:** 380×480 on desktop, 340×430 on phones; corner radius 24px; white face, no border, no shadow at rest.
  Front: level ("A2"), optional badge ("Ưu tiên" / "Lâu chưa ôn"), speak button (44px), the word, part of speech,
  hint "Bấm vào thẻ hoặc Space để lật". Back: word and part of speech, meaning, form chips ("Dạng chia"), "Câu mẫu" on
  a pale tray band, "Câu bạn đã gặp" on a pale blue band, stage line "Đang ở ngăn …".
- **Stack:** two cards visible under the top one, offset 15px and 29px down, scaled .955 and .91, tilted -1.4° and
  1.6°, tone stepped; their text hidden until they come to the top.
- **Stamps:** filled rounded label near the card's lower edge, rotated ±7°, on the trailing side of the drag:
  "Đã biết · lên ngăn …" (green), "Cần ôn lại · về ngăn 1 ngày" (rust). Opacity follows drag distance.
- **Piles:** left "Cần ôn lại · về ngăn 1 ngày", right "Đã biết · lên một ngăn"; a 132×164 slot of fallen mini cards
  (word plus a coloured top bar), a 32px count under it. Empty slot reads "Kéo thẻ sang trái / phải". On phones the
  piles become two count chips above the card.
- **Buttons:** 56px tall, radius 16px, flat. "Lật thẻ" / "Xem mặt trước" in Desk Ink; "Cần ôn lại" and "Đã biết" in
  white with a coloured dot, shown as Deep Biro and aria-disabled until the card is turned. Press: scale .97.
- **Progress:** one 11×15 tick per card in the top bar (Pale Tray, Desk Ink for the current card, then green or rust),
  plus "còn N thẻ".
- **Summary:** "Xong N thẻ." at 84px; "Thẻ cần ôn lại quay về ngăn 1 ngày và nằm đầu nhóm." when any card went back;
  two white panels listing the words of each pile; "Về trang chủ" (Enter).

## 5. Layout Principles

- Desktop: top bar on white, then the blue stage under a deck-name tab. Stage grid: pile 210px | card | pile 210px,
  buttons centred below in a 640px row.
- Below 860px: piles side by side as chips, card full width up to 340px, buttons below (flip on its own row under
  560px).
- No horizontal scroll at 390px (checked).

## 6. Motion & Interaction

- **Flip:** tap, click or Space; rotateY 180° over 400ms ease-in-out. The back must be seen before answering, as the
  app requires today; dragging an unturned card resists (30% of the hand, capped at 56px) and says "Lật thẻ để xem
  nghĩa trước đã."
- **Drag:** the card follows the pointer with pointer capture; rotation 0.06° per px, capped at 16°, pivot at the
  card's bottom edge; vertical movement damped to 35%. The card underneath rises and its text fades in with the drag.
- **Release:** past 110px, or a flick faster than 0.55 px/ms over at least 30px, commits. The card flies to its pile
  (300–380ms, ease-out, shorter for faster flicks) and lands as a mini card with a small bounce; the count bumps.
  Short of that, it springs back (420ms, slight overshoot).
- **Next card:** the stack shifts up one place with a spring (460ms); the new top card's text fades in.
- **Keys:** Space flip, ← or 1 "Cần ôn lại", → or 2 "Đã biết", Esc ends and shows the summary. Key answers fly in 300ms.
- **First-card hint:** once per session, 2.4s after the first card is turned with no drag, the card sways left then
  right with the stamps at 45%, and the line "Kéo thẻ sang trái hoặc phải để chọn." appears.
- **Reduced motion:** no rotation, no flight, no spring; the card fades out (140ms), faces swap by opacity, counts
  update without bounce. Dragging still moves the card sideways because the hand drives it.
- No perpetual loops on this screen: it is used many times a day.

## 7. Anti-Patterns (Banned)

- No shadows at rest; only the held or flying card casts one.
- No gradients, glass, neon glows, emoji, decorative blobs.
- No monospace, no uppercase letter-spaced labels, no eyebrow labels.
- No third accent colour; green and rust only mark answers.
- No answering before the card is turned.
- No invented features presented as real: there is no undo in the API today; a swipe is final once it lands.
