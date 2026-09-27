import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { ThemeProvider } from "next-themes";

import { Toaster } from "@/components/ui/sonner";
import { ogImage, siteConfig } from "@/lib/config";

import "./globals.css";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  description: siteConfig.description,
  icons: [
    {
      rel: "icon",
      sizes: "96x96",
      type: "image/png",
      url: `${siteConfig.url}/favicon/favicon-96x96.png`,
    },
    {
      rel: "icon",
      type: "image/svg+xml",
      url: `${siteConfig.url}/favicon/favicon.svg`,
    },
    {
      rel: "shortcut icon",
      url: `${siteConfig.url}/favicon/favicon.ico`,
    },
    {
      rel: "apple-touch-icon",
      sizes: "180x180",
      url: `${siteConfig.url}/favicon/apple-touch-icon.png`,
    },
    {
      rel: "manifest",
      url: `${siteConfig.url}/favicon/site.webmanifest`,
    },
  ],
  metadataBase: new URL(siteConfig.url),
  openGraph: {
    description: siteConfig.description,
    images: [ogImage],
    locale: "en-US",
    siteName: siteConfig.name,
    title: siteConfig.name,
    type: "website",
    url: siteConfig.url,
  },
  other: {
    "apple-mobile-web-app-title": siteConfig.shortName,
  },
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  twitter: {
    card: "summary_large_image",
    creator: siteConfig.creator,
    description: siteConfig.description,
    images: [ogImage],
    title: siteConfig.name,
  },
};

const RootLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => (
  <html lang="en" suppressHydrationWarning>
    <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        {children}
        <Toaster />
      </ThemeProvider>
      <Analytics />
      <SpeedInsights />
    </body>
  </html>
);

export default RootLayout;
