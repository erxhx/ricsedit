import type { Metadata, Viewport } from "next";
import { Fraunces, Inter_Tight } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const interTight = Inter_Tight({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Edit Studio — Barber · Wax · Tan",
  description:
    "Edit Studio is a collaborative salon in Oak Bay, Victoria BC. Precision barbering, custom-blended sunless tans, brow & body waxing.",
  authors: [{ name: "Edit Studio" }],
  robots: "follow, index, max-snippet:-1, max-video-preview:-1, max-image-preview:large",
  openGraph: {
    type: "website",
    siteName: "Edit Studio",
    title: "Edit Studio — Barber · Wax · Tan",
    description:
      "A collaborative salon in Oak Bay, Victoria BC. Precision barbering, custom-blended sunless tans, brow & body waxing.",
    url: "https://editstudio.space/",
    locale: "en_CA",
    images: [
      {
        url: "https://www.editstudio.space/assets/og-image.jpg",
        width: 1200,
        height: 628,
        alt: "Edit Studio — Oak Bay, Victoria BC",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Edit Studio — Barber · Wax · Tan",
    description:
      "A collaborative salon in Oak Bay, Victoria BC. Precision barbering, custom-blended sunless tans, brow & body waxing.",
    images: {
      url: "https://www.editstudio.space/assets/og-image.jpg",
      alt: "Edit Studio — Oak Bay, Victoria BC",
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f4ef" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1814" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fraunces.variable} ${interTight.variable}`}>
      <body>{children}</body>
    </html>
  );
}
