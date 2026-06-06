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
  title: "Flowermon — fais germer ta fleur",
  description:
    "Crée, collecte et échange des fleurs génératives uniques sur Monad testnet.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={display.variable}>
      <body className="min-h-screen bg-void text-zinc-100 antialiased">
        <div className="grain" aria-hidden />
        {children}
      </body>
    </html>
  );
}
