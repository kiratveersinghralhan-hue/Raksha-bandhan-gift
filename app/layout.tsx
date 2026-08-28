import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, Manrope } from 'next/font/google';
import './globals.css';

const display = Cormorant_Garamond({ variable: '--font-display', subsets: ['latin'], weight: ['400', '500', '600'] });
const sans = Manrope({ variable: '--font-sans', subsets: ['latin'], weight: ['300', '400', '500', '600'] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? 'http://localhost:3000'),
  title: 'A Little Piece of Home — Happy Raksha Bandhan',
  description: 'A little something made from India, for my sister in Canada.',
  openGraph: {
    type: 'website',
    title: 'A Little Piece of Home — Happy Raksha Bandhan',
    description: 'A little something made from India, for my sister in Canada.',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'A Little Piece of Home — a gift from India to Canada' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'A Little Piece of Home — Happy Raksha Bandhan',
    description: 'A little something made from India, for my sister in Canada.',
    images: ['/og.png'],
  },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#020202' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${display.variable} ${sans.variable}`}>{children}</body></html>;
}
