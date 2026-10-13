import "@/styles/globals.css";

import { type Metadata } from "next";
import { Inter, Montserrat, Open_Sans, Roboto } from "next/font/google";

import { TRPCReactProvider } from "@/trpc/react";
import { SkeletonProvider } from "@/components/ui/skeleton-provider";
import { Toaster } from "@/components/ui/sonner";
import { CookieBanner } from "./_components/layout/CookieBanner";

export const metadata: Metadata = {
  title: "Virat CRM",
  description: "CRM for workforce and sales management",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Virat CRM",
  },
  formatDetection: {
    telephone: false,
  },
  icons: [
    { rel: "icon", url: "/favicon.ico" },
    { rel: "apple-touch-icon", url: "/icon-192.png" },
  ],
};

export const viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});

const openSans = Open_Sans({
  subsets: ["latin"],
  variable: "--font-open-sans",
  display: "swap",
});

const roboto = Roboto({
  weight: ["300", "400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-roboto",
  display: "swap",
});

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html 
      lang="en" 
      className={`light ${inter.variable} ${montserrat.variable} ${openSans.variable} ${roboto.variable}`}
    >
      <body className="bg-background text-foreground selection:bg-primary/10 selection:text-primary min-h-screen antialiased">
        <TRPCReactProvider>
          <SkeletonProvider>
            {children}
            <Toaster />
            <CookieBanner />
          </SkeletonProvider>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
