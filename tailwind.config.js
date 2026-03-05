/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#1E40AF', // Bleu professionnel <Client>
                    foreground: '#FFFFFF',
                },
                success: '#16A34A',
                alert: '#D97706',
                error: '#DC2626',
            },
        },
    },
    plugins: [],
}
