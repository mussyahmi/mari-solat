import type { Metadata } from "next";
import { Fraunces } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import AppShell from "@/components/AppShell";
import WakeLock from "@/components/WakeLock";
import UpdatePrompt from "@/components/UpdatePrompt";
import { Toaster } from "@/components/ui/sonner";
import WarnaTema from "@/components/WarnaTema";
import { WARNA_TEMA } from "@/lib/warna-tema";

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
  //
  // Nilai ini hanyalah pengganti SSR: themeColor hanya boleh membawa satu
  // warna, jadi ia mengambil tema lalai. WarnaTemaInit membetulkannya semasa
  // HTML dihurai, dan WarnaTema mengekalkannya betul selepas itu.
  themeColor: WARNA_TEMA.gelap,
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

/**
 * Berjalan semasa HTML dihurai, sebelum cat pertama, bersama skrip sebaris
 * next-themes. Tanpanya pengguna mod cerah yang membuka aplikasi mendapat bar
 * status gelap sehingga penghidratan selesai, kerana themeColor SSR di atas
 * hanya boleh membawa satu nilai. Ia membaca kunci localStorage yang sama
 * yang ditulis next-themes, jadi kedua-duanya bersetuju pada bingkai pertama.
 */
function WarnaTemaInit() {
  const js = `try{var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',localStorage.getItem('theme')==='light'?'${WARNA_TEMA.cerah}':'${WARNA_TEMA.gelap}')}catch(e){}`;
  return <script dangerouslySetInnerHTML={{ __html: js }} />;
}

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
          <WarnaTemaInit />
          <WarnaTema />
          <WakeLock />
          <UpdatePrompt />
          <AppShell>{children}</AppShell>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
