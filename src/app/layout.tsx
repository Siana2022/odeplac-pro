import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
});

export const viewport: Viewport = {
  themeColor: "#1e3d6b",
  width: "device-width",
  initialScale: 1,
  // La tablet necesita poder ampliar (planos, letra pequeña). En Android el
  // zoom automático al enfocar campos se evita con font-size >= 16px.
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  // El teclado en pantalla reduce el viewport en vez de taparlo todo
  interactiveWidget: "resizes-content",
}

export const metadata: Metadata = {
  title: "ODEPLAC PRO",
  description: "Sistema de gestión para Odeplac Construcciones en Seco",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ODEPLAC PRO",
  },
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <script dangerouslySetInnerHTML={{
          __html: `
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js').then(reg => {
                  reg.update();
                }).catch(() => {});
              });
            }
          `
        }} />
      </head>
      <body
        className={`${archivo.variable} antialiased font-archivo bg-[#295693]`}
        suppressHydrationWarning
      >
        <Toaster position="top-center" richColors />
        {children}
      </body>
    </html>
  );
}
