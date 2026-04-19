import './globals.css';
import { ThemeProvider } from '../lib/ThemeProvider';

export const metadata = {
  title: 'RecipeAI - Find Recipes with AI',
  description: 'AI-powered recipe recommendations based on ingredients you already have.',
  manifest: '/manifest.json',
  themeColor: '#00C8D4',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'RecipeAI',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#00C8D4" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body style={{ margin: 0, overflowX: 'hidden' }}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
