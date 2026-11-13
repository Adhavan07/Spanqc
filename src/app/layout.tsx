import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Barlow_Condensed } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers/QueryProvider";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

const barlowCondensed = Barlow_Condensed({
  weight: ["600", "700", "800", "900"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-heading",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "Wiring Diagram QC Assistant | Check every wiring diagram against your standards",
  description:
    "AI validation of electrical wiring diagrams against engineering standards, with QC reports as PDF or Excel.",
  // TODO: Replace [domain] with production domain after deploy
  openGraph: {
    title: "Check every wiring diagram against your standards",
    description:
      "AI validation of electrical wiring diagrams against engineering standards, with QC reports as PDF or Excel.",
    url: "https://[domain]/",
    images: [
      {
        url: "https://[domain]/frames/frame_001.webp",
        width: 1600,
        height: 900,
        alt: "Wiring Diagram QC Assistant",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Check every wiring diagram against your standards",
    description:
      "AI validation of electrical wiring diagrams against engineering standards, with QC reports as PDF or Excel.",
    images: ["https://[domain]/frames/frame_001.webp"],
  },
  icons: {
    icon: "/favicon.svg",
  },
  authors: [{ name: "Spandsons Horizon Engineering Pvt. Ltd." }],
  other: {
    google: "notranslate",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} ${barlowCondensed.variable} dark notranslate`}
      translate="no"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body
        className="min-h-screen bg-[#070c18] font-sans text-slate-100 antialiased selection:bg-blue-600/30 selection:text-blue-200 notranslate"
        translate="no"
        suppressHydrationWarning
      >
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
