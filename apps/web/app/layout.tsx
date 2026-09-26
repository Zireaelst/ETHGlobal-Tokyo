import type { Metadata } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import { GeistPixelCircle } from "geist/font/pixel";
import type { ReactNode } from "react";
import { SuiProvider } from "../components/connection/sui-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: "400",
});

export const metadata: Metadata = {
  title: "Coffer — Autonomous Treasury Within Your Rules",
  description:
    "Policy-enforced autonomous treasury infrastructure built on Sui.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html data-scroll-behavior="smooth" lang="en">
      <body
        className={`${inter.variable} ${instrumentSerif.variable} ${GeistPixelCircle.variable}`}
      >
        <SuiProvider>{children}</SuiProvider>
      </body>
    </html>
  );
}
