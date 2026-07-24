import type { Metadata, Viewport } from "next";
import { PwaManager } from "@/components/pwa/PwaManager";
import { NativeBridge } from "@/components/native/NativeBridge";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "JunkQuote Pro",
  title: { default: "JunkQuote Pro", template: "%s | JunkQuote Pro" },
  description:
    "Junk-removal estimating, scheduling, field operations, invoicing, and payments.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "JunkQuote Pro",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/icons/icon-192.png", type: "image/png", sizes: "192x192" },
    ],
    apple: [
      {
        url: "/icons/apple-touch-icon.png",
        type: "image/png",
        sizes: "180x180",
      },
    ],
  },
  formatDetection: { telephone: false, address: false, email: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0B1118",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
        <NativeBridge />
        <PwaManager />
      </body>
    </html>
  );
}
