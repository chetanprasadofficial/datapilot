import type { Metadata } from "next";
import DataHelix from "./DataHelix";
import ThemeToggle from "./ThemeToggle";
import CursorGlow from "./CursorGlow";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "DataPilot",
  description: "Describe the data you need. Get a clean, sourced dataset.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <CursorGlow />
        <ThemeToggle />
        <DataHelix />
      </body>
    </html>
  );
}
