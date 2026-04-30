import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { AdSlot } from '@/components/AdSlot';

export const metadata: Metadata = {
  title: 'Riftboard — League of Legends Stats',
  description:
    'Search players, view match history, browse champions, and explore ranked leaderboards.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6">
            <AdSlot id="top" className="mb-6" />
            {children}
            <AdSlot id="bottom" className="mt-12" />
          </main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
