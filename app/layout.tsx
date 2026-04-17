import type { Metadata } from "next";
import { Plus_Jakarta_Sans, DM_Serif_Display, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import Header from "@/components/Header";
import WakeLock from "@/components/WakeLock";
import UpdatePrompt from "@/components/UpdatePrompt";
import { Toaster } from "sonner";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const dmSerifDisplay = DM_Serif_Display({
  variable: "--font-dm-serif-display",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport = {
  maximumScale: 1,
};

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
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MariSolat",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ms" suppressHydrationWarning>
      <body
        className={`${plusJakartaSans.variable} ${dmSerifDisplay.variable} ${geistMono.variable} antialiased h-dvh flex flex-col`}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <Header />
          <WakeLock />
          <UpdatePrompt />
          <div className="flex-1 min-h-0 overflow-y-auto">
            {children}
          </div>
          <Toaster position="top-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
