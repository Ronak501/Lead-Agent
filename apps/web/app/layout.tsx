import './globals.css';
import type { Metadata } from 'next';
import Script from 'next/script';
import { AppProvider } from '../context/AppContext';

export const metadata: Metadata = { 
  title: 'LeadPilot AI | Ornitech Solutions', 
  description: 'Evidence-based lead generation and human-approved outreach for Ornitech Solutions' 
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { 
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Sans:ital,wght@0,400..700;1,400..700&family=Source+Serif+4:ital,opsz,wght@0,8..60,400..800;1,8..60,400..800&display=swap"
          rel="stylesheet"
        />
        <Script src="https://accounts.google.com/gsi/client" strategy="beforeInteractive" />
      </head>
      <body className="antialiased selection:bg-[#ad7d62]/30 selection:text-[#29251d]">
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  ); 
}
