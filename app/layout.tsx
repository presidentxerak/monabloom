import type { Metadata } from "next";
import { Silkscreen } from "next/font/google";
import "./globals.css";
import MobileNav from "@/components/MobileNav";

const display = Silkscreen({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Flowermon · grow your flower",
  description:
    "Create, collect and trade unique generative 3D flowers on Monad testnet.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={display.variable}>
      <body className="min-h-screen font-display text-zinc-800 antialiased">
        {children}
        <MobileNav />
      </body>
    </html>
  );
}
