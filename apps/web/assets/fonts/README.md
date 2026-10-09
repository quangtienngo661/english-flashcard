# Fonts for Open Graph images

`BeVietnamPro-Regular.ttf`, `BeVietnamPro-ExtraBold.ttf` and `OFL.txt` were downloaded on 2026-10-08 from
https://github.com/google/fonts/tree/main/ofl/bevietnampro (SIL Open Font License 1.1, see `OFL.txt`).

They are used only by `src/app/[locale]/opengraph-image.tsx`, because `next/og` reads TTF/OTF/WOFF but not WOFF2.
The page itself loads Be Vietnam Pro through `next/font/google`.
