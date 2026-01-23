import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@/styles/globals.css';
import Scene from '@/components/canvas/Scene';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'NEURALIS',
    description: 'Spatial AI Agent Platform',
};

import { ThemeProvider } from '@/providers/ThemeProvider';

// ...

import { GlobalLoader } from '@/components/ui/GlobalLoader';

// ...

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className={inter.className}>
                <ThemeProvider>
                    <GlobalLoader />
                    {/* The 3D World Layer */}
                    <Scene />

                    {/* The UI Overlay Layer */}
                    <main className="relative z-10 w-full h-screen pointer-events-none">
                        {/* Allow pointer events only on interactive children */}
                        <div className="w-full h-full pointer-events-auto">
                            {children}
                        </div>
                    </main>
                </ThemeProvider>
            </body>
        </html>
    );
}
