"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

/**
 * Toast dalam bahasa reka bentuk aplikasi.
 *
 * Sebelum ini app/layout.tsx mengimport Toaster terus daripada "sonner",
 * memintas pembalut ini sepenuhnya, dan menambah `richColors` — yang memaksa
 * palet merah/hijau sonner sendiri. Hasilnya kad putih dengan teks merah
 * terang di atas aplikasi hijau-gelap yang minimalis.
 *
 * Tiada latar berwarna di sini: setiap toast menggunakan permukaan popover
 * yang sama seperti dialog, dan ikon sahaja yang membawa maksudnya. Itu
 * konsisten dengan seluruh aplikasi, di mana warna digunakan berhemat.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "dark" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      // Kanan atas bertindih dengan butang menu pada telefon.
      position="top-center"
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4 text-primary" />,
        info: <InfoIcon className="size-4 text-muted-foreground" />,
        warning: <TriangleAlertIcon className="size-4 text-amaran" />,
        error: <OctagonXIcon className="size-4 text-destructive" />,
        loading: <Loader2Icon className="size-4 animate-spin text-muted-foreground" />,
      }}
      toastOptions={{
        classNames: {
          toast: "rounded-2xl border border-border bg-popover text-popover-foreground shadow-naik",
          title: "font-semibold",
          description: "text-muted-foreground",
          actionButton:
            "rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground",
          cancelButton:
            "rounded-full border border-border px-3 py-1 text-xs text-muted-foreground",
        },
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
