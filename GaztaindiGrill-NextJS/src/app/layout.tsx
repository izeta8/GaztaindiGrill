import type { Metadata } from "next";
import { connection } from "next/server";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Navbar } from "@/components/shared/Navbar";
import { GlobalActionFab } from "@/components/shared/GlobalActionFab";
import { ViewTransitions } from 'next-view-transitions'
import { readMqttConfig } from "@/server/mqttConfig";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gaztaindi Grill",
  description: "Sistema de control de parrilla inteligente",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Renders on each request: a prerendered page would freeze the build's environment.
  await connection();
  const mqttConfig = readMqttConfig();

  return (
    <ViewTransitions>
      <html lang="en" suppressHydrationWarning>
        <body
          suppressHydrationWarning
          className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}
        >
          <Providers mqttConfig={mqttConfig}>
            <Navbar />
            <main className="flex-1">
              {children}
            </main>
            <GlobalActionFab />
          </Providers>
        </body>
      </html>
    </ViewTransitions>
  );
}
