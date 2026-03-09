"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Next.js App Error:", error);
  }, [error]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-foreground p-6 text-center">
      <div className="bg-panel border border-panelBorder p-8 rounded-2xl max-w-md shadow-2xl flex flex-col items-center">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold mb-3 text-white">Something went wrong!</h2>
        <p className="text-gray-400 mb-8 text-sm leading-relaxed">
          {error.message || "An unexpected error occurred in the application ecosystem."}
        </p>
        <div className="flex gap-4">
          <button
            onClick={() => reset()}
            className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-colors border border-white/5"
          >
            Try again
          </button>
          <Link
            href="/"
            className="px-6 py-3 bg-accent hover:bg-accentHover text-white rounded-xl font-medium transition-colors shadow-lg"
          >
            Go to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
