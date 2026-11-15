/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './app/**/*.{js,ts,jsx,tsx}',
        './components/**/*.{js,ts,jsx,tsx}',
        './content/**/*.{js,ts,jsx,tsx}',
    ],
    theme: {
        extend: {
            // Colours taken from the AFKC crest.
            colors: {
                pantai: '#F9CF00', // crest yellow
                laut: { DEFAULT: '#0A72B8', dalam: '#083A63', muda: '#E6F2FA' },
                udang: { DEFAULT: '#D62B1F', tua: '#B21F15' },
                daun: '#12893B',
            },
            fontFamily: {
                display: ['var(--font-display)', 'Impact', 'sans-serif'],
                body: ['var(--font-body)', 'system-ui', 'sans-serif'],
            },
        },
    },
    plugins: [],
};
