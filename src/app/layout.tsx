import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SessionBootstrap } from "@/components/session-bootstrap";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Arena Tembak Simple",
  description:
    "Game tembak-tembakan deathmatch sederhana di browser: pilih senjata, pilih peta, lawan musuh otomatis.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-slate-950 text-slate-100">
        <SessionBootstrap />
        {children}
      </body>
    </html>
  );
}
