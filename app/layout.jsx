import './globals.css';

export const metadata = {
  title: 'Recipe Finder — Discover Your Next Meal',
  description: 'AI-powered recipe recommendations based on ingredients you already have.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="font-body antialiased">{children}</body>
    </html>
  );
}
