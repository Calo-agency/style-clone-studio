import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Style Clone Studio",
  description: "Recrie estilos de ilustracao com comparativo multi-IA.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
