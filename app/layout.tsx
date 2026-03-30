import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import ClientErrorBoundary from "../components/system/client-error-boundary";
import DomMutationGuard from "../components/system/dom-mutation-guard";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Ponto OR — Gestão de Ponto Eletrônico",
  description: "Sistema de controle de jornada e ponto eletrônico para empresas",
  icons: [
    { rel: "icon", url: "/logo 750x400.png" },
    { rel: "shortcut icon", url: "/logo 750x400.png" },
    { rel: "apple-touch-icon", url: "/logo 750x400.png" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={plusJakarta.variable}>
      <body className="min-h-screen font-sans antialiased">
        <DomMutationGuard />
        <ClientErrorBoundary>{children}</ClientErrorBoundary>
      </body>
    </html>
  );
}
