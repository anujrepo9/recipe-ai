import './globals.css';
import { ThemeProvider } from '../lib/ThemeProvider';

export const metadata = {
  title: 'Recipe Finder — Discover Your Next Meal',
  description: 'AI-powered recipe recommendations based on ingredients you already have.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body style={{ margin: 0, overflowX: 'hidden' }}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
