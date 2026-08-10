import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const incoming = await headers();
  const host = incoming.get("x-forwarded-host") ?? incoming.get("host") ?? "localhost:3000";
  const protocol =
    incoming.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = new URL(`${protocol}://${host}`);

  return {
    metadataBase: origin,
    title: "Estoque Soviético",
    description: "Controle operacional de estoque, vendas e crédito.",
    manifest: "/manifest.webmanifest",
    icons: {
      icon: [
        { url: "/icons/favicon-48.png", type: "image/png", sizes: "48x48" },
        { url: "/icons/app-icon-192.png", type: "image/png", sizes: "192x192" },
      ],
      shortcut: "/icons/favicon-48.png",
      apple: "/icons/apple-touch-icon.png",
    },
    openGraph: {
      title: "Estoque Soviético",
      description: "Controle operacional de estoque, vendas e crédito.",
      images: [{ url: new URL("/og.png", origin).toString(), width: 1536, height: 1024 }],
      locale: "pt_BR",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "Estoque Soviético",
      description: "Controle operacional de estoque, vendas e crédito.",
      images: [new URL("/og.png", origin).toString()],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
