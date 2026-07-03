import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "Promo Builder — MTA Copy Intelligence",
  description: "AI-powered VSL / promo writing tool for Monument Traders Alliance",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistMono.variable} antialiased`} suppressHydrationWarning>
        {children}
        {/* OxfordHub cross-app auth gate + top nav. Reveals <html> after auth. */}
        <Script
          src="https://oxfordhub.app/hub-nav.js"
          data-project-id="promo-builder"
          strategy="afterInteractive"
          id="hub-nav"
        />
      </body>
    </html>
  );
}
