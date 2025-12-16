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
  title: "MariSolat - Waktu Solat Malaysia",
  description:
    "Pantau waktu solat harian di Malaysia termasuk tarikh Miladi & Hijri, jadual lengkap solat untuk semua zon dengan MariSolat.",
  keywords: ["MariSolat", "Waktu Solat", "Malaysia", "Hijri", "Prayer Times", "Islamic Schedule"],
  authors: [{ name: "MariSolat Team" }],
  creator: "MariSolat",
  openGraph: {
    title: "MariSolat - Waktu Solat Malaysia",
    description:
      "Jadual lengkap waktu solat harian di Malaysia beserta tarikh Miladi & Hijri dengan MariSolat.",
    url: "https://marisolat.com",
    siteName: "MariSolat",
    // images: [
    //   {
    //     url: "https://marisolat.com/og-image.png",
    //     width: 1200,
    //     height: 630,
    //     alt: "MariSolat - Waktu Solat Malaysia",
    //   },
    // ],
    locale: "ms_MY",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MariSolat - Waktu Solat Malaysia",
    description:
      "Jadual lengkap waktu solat harian di Malaysia beserta tarikh Miladi & Hijri dengan MariSolat.",
    // images: ["https://marisolat.com/og-image.png"],
    creator: "@marisolat",
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
