import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import { MessageCircle } from "lucide-react"; // Importamos el icono
import "./globals.css";

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
      <body className={`${archivo.variable} antialiased font-archivo bg-[#295693] text-white`}>
        {children}
        
        {/* BOTÓN FLOTANTE IA GENERAL */}
        <button 
          title="Asistente General"
          className="fixed bottom-8 right-8 z-[9999] flex h-16 w-16 items-center justify-center rounded-full bg-white text-[#295693] shadow-2xl transition-transform hover:scale-110 active:scale-95 cursor-pointer border-none"
        >
          <MessageCircle size={32} />
        </button>
      </body>
    </html>
  );
}