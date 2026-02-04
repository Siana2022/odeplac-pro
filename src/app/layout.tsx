import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import { MessageCircle } from "lucide-react"; 
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
      <body className={`${archivo.variable} antialiased font-archivo`}>
        {children}
        
        {/* BOTÓN FLOTANTE IA GENERAL - FIJO EN LA ESQUINA */}
        <button 
          title="Asistente General"
          className="fixed bottom-10 right-10 z-[99999] flex h-16 w-16 items-center justify-center rounded-full bg-white text-[#295693] shadow-[0_10px_40px_rgba(0,0,0,0.4)] transition-all hover:scale-110 active:scale-95 cursor-pointer border-none"
        >
          <MessageCircle size={32} />
        </button>
      </body>
    </html>
  );
}