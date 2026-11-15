import { Big_Shoulders, Hanken_Grotesk } from 'next/font/google';

/** Condensed, jersey-like display face for the public pages. */
export const displayFont = Big_Shoulders({ subsets: ['latin'], weight: ['700', '900'], variable: '--font-display' });
export const bodyFont = Hanken_Grotesk({ subsets: ['latin'], weight: ['400', '500', '700'], variable: '--font-body' });
export const publicFonts = `${displayFont.variable} ${bodyFont.variable}`;
