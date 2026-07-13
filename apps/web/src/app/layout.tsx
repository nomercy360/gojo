import { PrivacyChoices } from "@/components/privacy-choices";
import { SiteHeader } from "@/components/site-header";
import type { Metadata, Viewport } from "next";
import {
  Fraunces,
  Inter,
  JetBrains_Mono,
  Manrope,
  Noto_Sans_JP,
  Noto_Serif_JP,
  PT_Serif,
  Unbounded,
} from "next/font/google";
import type { ReactNode } from "react";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});

const unbounded = Unbounded({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "700", "900"],
  variable: "--font-unbounded",
  display: "swap",
});

const ptSerif = PT_Serif({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "700"],
  variable: "--font-pt-serif",
  display: "swap",
});

const notoSansJp = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-noto-sans-jp",
  display: "swap",
});

const notoSerifJp = Noto_Serif_JP({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-noto-serif-jp",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

// Landing-page (v14) fonts: Fraunces is latin-only — Cyrillic headings fall back
// to PT Serif via the --font-display stack in globals.css; Manrope covers Cyrillic.
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["600", "900"],
  variable: "--font-fraunces",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Gojo Learn — Школа японского нового поколения",
  description:
    "Японский как система: урок → разбор → повторение → прогресс. От нуля до N2 с живыми преподавателями и технологиями. 五条",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="ru"
      className={`${inter.variable} ${ptSerif.variable} ${unbounded.variable} ${notoSansJp.variable} ${notoSerifJp.variable} ${jetbrainsMono.variable} ${fraunces.variable} ${manrope.variable}`}
    >
      <body>
        <SiteHeader />
        {children}
        <PrivacyChoices />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              border: "2px solid #1A1A1A",
              borderRadius: "8px",
              fontWeight: 700,
              fontSize: "13px",
            },
          }}
        />
      </body>
    </html>
  );
}
