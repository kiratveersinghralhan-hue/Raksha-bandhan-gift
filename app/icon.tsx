import { ImageResponse } from 'next/og';

export const size = { width: 64, height: 64 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e3c489', background: '#050504', border: '2px solid #9d7946', fontSize: 37, fontFamily: 'serif' }}>H</div>,
    size,
  );
}
