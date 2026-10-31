import type { Metadata } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import AppShell from "@/components/AppShell";
import WakeLock from "@/components/WakeLock";
import UpdatePrompt from "@/components/UpdatePrompt";
import { Toaster } from "@/components/ui/sonner";
import WarnaTema from "@/components/WarnaTema";
import { WARNA_TEMA } from "@/lib/warna-tema";
import { SKRIP_AKSEN } from "@/lib/aksen";

// Satu keluarga huruf untuk keseluruhan aplikasi. Paksi saiz optik Fraunces
// bermakna teks kecil dan angka kiraan detik yang besar mendapat potongan
// yang berbeza secara automatik — jadi satu fon melakukan kerja dua fon,
// tanpa lindung nilai.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
});

// Teks antara muka dalam sans geometri yang bulat dan mesra; Fraunces kekal
// untuk tajuk dan angka paparan, di mana wataknya paling terasa.
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});


export const metadata: Metadata = {
  // Domain yang benar-benar dilayan. Sebelum ini marisolat.com, yang tiada
  // rekod DNS langsung — jadi setiap URL metadata, termasuk og:image,
  // menghala ke hos yang tidak wujud dan pratonton pautan pada Threads,
  // WhatsApp dan Facebook terpapar rosak. Tukar ini jika marisolat.com
  // disambungkan kelak.
  metadataBase: new URL("https://marisolat.web.app"),
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
    url: "https://marisolat.web.app",
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
 * Mencipta dan mengisi meta theme-color semasa HTML dihurai, sebelum cat
 * pertama, bersama skrip sebaris next-themes.
 *
 * Meta ini sengaja TIDAK datang daripada eksport `viewport` Next. Eksport itu
 * menjadikan React pemilik nod tersebut, dan WarnaTema membuangnya untuk
 * memaksa WebKit mengambil semula warna — jadi navigasi sisi klien seterusnya
 * membuatkan React cuba membuang nod yang parentNode-nya sudah null, dan
 * melontar "Cannot read properties of null (reading 'removeChild')". Dengan
 * meta ini dimiliki sepenuhnya oleh klien, tiada pertembungan. Tanpanya pengguna mod cerah yang membuka aplikasi mendapat bar
 * status gelap sehingga penghidratan selesai, kerana themeColor SSR di atas
 * hanya boleh membawa satu nilai. Ia membaca kunci localStorage yang sama
 * yang ditulis next-themes, jadi kedua-duanya bersetuju pada bingkai pertama.
 */
function WarnaTemaInit() {
  const js = `try{var m=document.querySelector('meta[name="theme-color"]');if(!m){m=document.createElement('meta');m.setAttribute('name','theme-color');document.head.appendChild(m)}m.setAttribute('content',localStorage.getItem('theme')==='dark'?'${WARNA_TEMA.gelap}':'${WARNA_TEMA.cerah}')}catch(e){}`;
  return <script dangerouslySetInnerHTML={{ __html: js + SKRIP_AKSEN }} />;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ms" className={`${fraunces.variable} ${jakarta.variable}`} suppressHydrationWarning>
      <body
        className="antialiased"
      >
        {/* Cerah lembut sebagai lalai, berwarna mengikut tema pilihan; mod
            gelap kekal satu ketikan di kepala. */}
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
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
