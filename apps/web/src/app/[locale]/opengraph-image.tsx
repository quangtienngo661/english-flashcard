import { hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { ImageResponse } from 'next/og';
import { routing, type AppLocale } from '@/i18n/routing';
import { lexendExtraBold, lexendRegular } from './og-fonts.generated';

function fontData(base64: string): ArrayBuffer {
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)).buffer;
}

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

type Params = { params: Promise<{ locale: string }> };

export async function generateImageMetadata({ params }: Params) {
  const { locale: raw } = await params;
  const locale: AppLocale = hasLocale(routing.locales, raw) ? raw : routing.defaultLocale;
  const t = await getTranslations({ locale, namespace: 'Metadata' });
  return [{ id: 'default', alt: t('ogAlt'), size, contentType }];
}

// OG image colours mirror the design tokens (primary, on-primary, on-primary-muted, accent, ink); next/og cannot read CSS variables.
export default async function Image({ params }: Params) {
  const { locale: raw } = await params;
  const locale: AppLocale = hasLocale(routing.locales, raw) ? raw : routing.defaultLocale;
  const hero = await getTranslations({ locale, namespace: 'Hero' });
  const regular = fontData(lexendRegular);
  const extraBold = fontData(lexendExtraBold);
  const titleLines = String(hero.raw('title')).split('<br></br>');

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 72, background: '#2445d6', fontFamily: 'Lexend' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', background: '#ffd84a', borderRadius: 12, padding: '6px 14px', fontSize: 32, fontWeight: 800, color: '#0f1a3d' }}>_ _</div>
          <div style={{ display: 'flex', fontSize: 40, fontWeight: 800, color: '#ffffff' }}>Wordmet</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', fontSize: 84, fontWeight: 800, lineHeight: 1.1, color: '#ffffff', letterSpacing: -2 }}>
          {titleLines.map((line) => (
            <div key={line} style={{ display: 'flex' }}>{line}</div>
          ))}
        </div>
        <div style={{ display: 'flex', fontSize: 30, color: '#dfe5ff', maxWidth: 960 }}>{hero('chip')}</div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Lexend', data: regular, weight: 400, style: 'normal' },
        { name: 'Lexend', data: extraBold, weight: 800, style: 'normal' },
      ],
    },
  );
}
