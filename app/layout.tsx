import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Syne } from "next/font/google";
import "./globals.css";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

const display = Syne({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "TravelRooks — Trip Cost Optimization",
  description:
    "Sequential multi-agent trip planning with live flight scraping and rule-based cost optimization.",
  icons: {
    icon: "/travelrooks-logo.png",
    apple: "/travelrooks-logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`}>
      <body className="font-sans text-[15px] leading-relaxed">{children}</body>
    </html>
  );
}
