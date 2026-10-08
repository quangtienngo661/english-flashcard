import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { ImageResponse } from 'next/og';
import { routing, type AppLocale } from '@/i18n/routing';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

type Params = { params: Promise<{ locale: string }> };

export async function generateImageMetadata({ params }: Params) {
  const { locale: raw } = await params;
  const locale: AppLocale = hasLocale(routing.locales, raw) ? raw : routing.defaultLocale;
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  return [{ id: 'default', alt: t('ogAlt'), size, contentType }];
}

// OG image colours mirror the design tokens (bg, ink, muted, marker, primary); next/og cannot read CSS variables.
export default async function Image({ params }: Params) {
  const { locale: raw } = await params;
  const locale: AppLocale = hasLocale(routing.locales, raw) ? raw : routing.defaultLocale;
  const hero = await getTranslations({ locale, namespace: 'Hero' });
  const fontDir = join(process.cwd(), 'assets/fonts');
  const [regular, extraBold] = await Promise.all([
    readFile(join(fontDir, 'BeVietnamPro-Regular.ttf')),
    readFile(join(fontDir, 'BeVietnamPro-ExtraBold.ttf')),
  ]);
  const titleLines = String(hero.raw('title')).split('<br></br>');

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 72, background: '#faf8f5', fontFamily: 'Be Vietnam Pro' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', background: '#ffe08a', borderRadius: 12, padding: '6px 14px', fontSize: 32, fontWeight: 800, color: '#1c1b22' }}>_ _</div>
          <div style={{ display: 'flex', fontSize: 40, fontWeight: 800, color: '#1c1b22' }}>Wordmet</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', fontSize: 84, fontWeight: 800, lineHeight: 1.1, color: '#1c1b22', letterSpacing: -2 }}>
          {titleLines.map((line) => (
            <div key={line} style={{ display: 'flex' }}>{line}</div>
          ))}
        </div>
        <div style={{ display: 'flex', fontSize: 30, color: '#5e5b6b', maxWidth: 960 }}>{hero('chip')}</div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Be Vietnam Pro', data: regular, weight: 400, style: 'normal' },
        { name: 'Be Vietnam Pro', data: extraBold, weight: 800, style: 'normal' },
      ],
    },
  );
}
