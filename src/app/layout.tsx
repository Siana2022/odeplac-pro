import type { Metadata } from "next";
import { Archivo } from "next/font/google"; // Cambiamos Geist por Archivo
import "./globals.css";

// Configuramos la fuente Archivo
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "ODEPLAC PRO",
  description: "CRM for construction management",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${archivo.variable} antialiased font-archivo`}
      >
        {children}
      </body>
    </html>
  );
}