import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
});

export const metadata: Metadata = {
  title: "Odeplac Pro",
  description: "Sistema de gestión Odeplac",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${archivo.variable} antialiased font-archivo bg-[#295693]`}
        suppressHydrationWarning // <--- AÑADIDO AQUÍ TAMBIÉN PARA LAS EXTENSIONES
      >
        <Toaster position="top-center" richColors />
        {children}
      </body>
    </html>
  );
}