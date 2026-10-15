# Fonts for Open Graph images

`Lexend-Regular.ttf` (100,264 bytes) and `Lexend-ExtraBold.ttf` (105,516 bytes) were downloaded on 2026-10-15 from
https://github.com/googlefonts/lexend/tree/main/fonts/lexend/ttf, and `OFL.txt` from the root of the same repository
(SIL Open Font License 1.1, see `OFL.txt`). Downloaded with the owner's permission (design UB1/§4.3, Task 2).

They are used only by `src/app/[locale]/opengraph-image.tsx`, because `next/og` reads static TTF/OTF/WOFF but not WOFF2
or CSS. The page itself loads Lexend through `next/font/google`. After changing a file, run `pnpm gen:og-fonts`.
