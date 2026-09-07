import type { Metadata } from "next";
import { Fraunces } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import AppShell from "@/components/AppShell";
import WakeLock from "@/components/WakeLock";
import UpdatePrompt from "@/components/UpdatePrompt";
import { Toaster } from "sonner";

// Satu keluarga huruf untuk keseluruhan aplikasi. Paksi saiz optik Fraunces
// bermakna teks kecil dan angka kiraan detik yang besar mendapat potongan
// yang berbeza secara automatik — jadi satu fon melakukan kerja dua fon,
// tanpa lindung nilai.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
});

export const viewport = {
  // maximumScale dibuang: menyekat zum ialah kegagalan kebolehcapaian.
  themeColor: "#0b1310",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://marisolat.com"),
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
    locale: "ms_MY",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MariSolat - Waktu Solat Malaysia",
    description:
      "Jadual lengkap waktu solat harian di Malaysia beserta tarikh Miladi & Hijri dengan MariSolat.",
    creator: "@marisolat",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MariSolat",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ms" className={`dark ${fraunces.variable}`} suppressHydrationWarning>
      <body
        className="antialiased"
      >
        {/* Aplikasi solat paling kerap dibuka pada subuh dan selepas isyak,
            jadi gelap ialah lalai yang jujur untuknya. */}
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <WakeLock />
          <UpdatePrompt />
          <AppShell>{children}</AppShell>
          <Toaster position="top-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
