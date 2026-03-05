import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Moonana Studio",
  description: "Power-user image generation frontend for Google's Gemini models.",
  openGraph: {
    title: "Moonana Studio",
    description: "Absolute control over composition, character consistency, and style weights for AI image generation.",
    url: "https://moonanastudio.com",
    siteName: "Moonana Studio",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Moonana Studio",
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
