import type { Metadata } from "next";
import { Instrument_Sans, DM_Serif_Display, DM_Mono } from "next/font/google";
import { AppProvider } from "@/lib/context";
import "./globals.css";

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const dmSerifDisplay = DM_Serif_Display({
  variable: "--font-dm-serif-display",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "NovaHealth",
  description: "AI Nursing Assistant",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${instrumentSans.variable} ${dmSerifDisplay.variable} ${dmMono.variable}`}>
      <body>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
