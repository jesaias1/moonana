import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AIJourney",
  description: "Your creative AI image generation studio — powered by GPT Image 2.",
  openGraph: {
    title: "AIJourney",
    description: "Absolute control over composition, character consistency, and style weights for AI image generation.",
    url: "https://aijourney.app",
    siteName: "AIJourney",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AIJourney",
    description: "The power-user interface for generative AI.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-background text-foreground antialiased`}>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
