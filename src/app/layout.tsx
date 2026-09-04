import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Operation Blackout",
  description: "A simulated Linux CTF investigation — Investigate the breach.",
  icons: {
    icon: "/favicon.webp",
  },
  openGraph: {
    title: "Operation Blackout",
    description: "A high-security, retro-pixel themed Capture-The-Flag (CTF) competition. Operate an in-browser virtualized Linux terminal to investigate system breach incidents.",
    url: "https://operation-blackout-xbjx.onrender.com",
    siteName: "Operation Blackout",
    images: [
      {
        url: "/favicon.webp",
        width: 800,
        height: 600,
        alt: "Operation Blackout Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-[#0a0a0a]">
        <div className="crt-overlay" />
        {children}
      </body>
    </html>
  );
}
