import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

// Same mark as icon.svg (marker block with two blanks), drawn for iOS home screens.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 22, background: '#ffe08a', paddingTop: 50 }}>
        <div style={{ display: 'flex', width: 44, height: 16, borderRadius: 8, background: '#1c1b22' }} />
        <div style={{ display: 'flex', width: 44, height: 16, borderRadius: 8, background: '#1c1b22' }} />
      </div>
    ),
    size,
  );
}
