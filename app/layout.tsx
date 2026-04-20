import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ageless AI — Patient Acquisition for Aesthetic Practices',
  description: 'Show prospective patients their own face with treatments applied — before they ever contact your practice.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
