import type { Metadata } from "next";
import { DotGothic16 } from "next/font/google";
import "./globals.css";

const display = DotGothic16({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Flowermon — grow your flower",
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
      <body className="min-h-screen text-zinc-800 antialiased">{children}</body>
    </html>
  );
}
