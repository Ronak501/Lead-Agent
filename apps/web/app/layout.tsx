import './globals.css';
import type { Metadata } from 'next';
import Script from 'next/script';

export const metadata: Metadata = { 
  title: 'LeadPilot AI | Ornitech Solutions', 
  description: 'Evidence-based lead generation and human-approved outreach for Ornitech Solutions' 
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { 
  return (
    <html lang="en">
      <head>
        <Script src="https://accounts.google.com/gsi/client" strategy="beforeInteractive" />
      </head>
      <body>{children}</body>
    </html>
  ); 
}
