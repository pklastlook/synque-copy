import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SocialFlow — Social, Simplified",
  description:
    "SocialFlow is a liquid-retina social media team work management platform. Publish to multiple accounts in one flow, generate per-account AI content, and track advanced analytics.",
  keywords: [
    "social media management",
    "team workflow",
    "multi-account publishing",
    "AI content generation",
    "analytics",
    "SocialFlow",
  ],
  authors: [{ name: "SocialFlow" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <SonnerToaster
            position="top-center"
            richColors
            closeButton
            toastOptions={{
              style: {
                borderRadius: "16px",
                border: "1px solid var(--border)",
                background: "var(--popover)",
                color: "var(--popover-foreground)",
                boxShadow: "0 8px 32px -4px rgba(0,0,0,0.2), 0 0 0 1px rgba(255,255,255,0.05)",
                fontSize: "14px",
                fontWeight: "500",
                padding: "14px 18px",
                gap: "8px",
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
