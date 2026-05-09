import type { Metadata } from "next";
import { Bebas_Neue, JetBrains_Mono, Anton } from "next/font/google";
import "./globals.css";
import GrainOverlay from "@/components/GrainOverlay";

const display = Bebas_Neue({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400"],
});
const heavy = Anton({
  variable: "--font-heavy",
  subsets: ["latin"],
  weight: ["400"],
});
const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "MOGSCORE — Enter the Arena",
  description: "Live face-scanning rating. For entertainment only. Video never leaves your browser.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${heavy.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-arena text-bone relative overflow-x-hidden">
        <div className="fixed inset-0 pointer-events-none -z-10 bg-spotlight" />
        <GrainOverlay />
        {children}
      </body>
    </html>
  );
}
