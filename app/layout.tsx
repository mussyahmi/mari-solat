import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import Header from "@/components/Header";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "JomSolat - Waktu Solat Malaysia",
  description:
    "Pantau waktu solat harian di Malaysia termasuk tarikh Miladi & Hijri, jadual lengkap solat untuk semua zon dengan JomSolat.",
  keywords: ["JomSolat", "Waktu Solat", "Malaysia", "Hijri", "Prayer Times", "Islamic Schedule"],
  authors: [{ name: "JomSolat Team" }],
  creator: "JomSolat",
  openGraph: {
    title: "JomSolat - Waktu Solat Malaysia",
    description:
      "Jadual lengkap waktu solat harian di Malaysia beserta tarikh Miladi & Hijri dengan JomSolat.",
    url: "https://jomsolat.com",
    siteName: "JomSolat",
    // images: [
    //   {
    //     url: "https://jomsolat.com/og-image.png",
    //     width: 1200,
    //     height: 630,
    //     alt: "JomSolat - Waktu Solat Malaysia",
    //   },
    // ],
    locale: "ms_MY",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "JomSolat - Waktu Solat Malaysia",
    description:
      "Jadual lengkap waktu solat harian di Malaysia beserta tarikh Miladi & Hijri dengan JomSolat.",
    // images: ["https://jomsolat.com/og-image.png"],
    creator: "@jomsolat",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <Header />
          {children}
          <Toaster position="top-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
