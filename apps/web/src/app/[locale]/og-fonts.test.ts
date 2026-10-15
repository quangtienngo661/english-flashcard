import { lexendExtraBold, lexendRegular } from './og-fonts.generated';

// next/og needs static TTF data (it cannot read CSS or WOFF2); both embeds must be real TrueType files.
describe('OG fonts', () => {
  it('embeds Lexend Regular and ExtraBold as TrueType', () => {
    for (const font of [lexendRegular, lexendExtraBold]) {
      const head = Buffer.from(font, 'base64').subarray(0, 4);
      expect([...head]).toEqual([0x00, 0x01, 0x00, 0x00]);
    }
  });
});
