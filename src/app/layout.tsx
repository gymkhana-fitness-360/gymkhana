import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { LoadingBar } from "@/components/ui/loading-bar";
import { Toaster } from "@/components/ui/toaster";
import { createLogger } from "@/lib/logger";
import { APP_NAME, APP_TITLE, APP_DESCRIPTION } from "@/lib/site-config";

const logger = createLogger("app");

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: APP_TITLE,
  description: APP_DESCRIPTION,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_NAME,
  },
  icons: {
    apple: "/icon-192x192.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Initialize error monitoring on server side only
  if (typeof window === 'undefined' && process.env.NODE_ENV === 'development') {
    try {
      const { ErrorMonitor } = await import("@/lib/error-monitor");
      const monitor = ErrorMonitor.getInstance();
      if (!monitor.isRunning) {
        await monitor.start();
      }
    } catch (error) {
      logger.error("Failed to start error monitor:", error as Error);
    }
  }

  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={inter.className}>
        <LoadingBar />
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
