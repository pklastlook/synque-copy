import type { Metadata, Viewport } from "next";
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
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SocialFlow",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "SocialFlow",
    title: "SocialFlow — Social, Simplified",
    description: "The enterprise platform for social media teams",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0f" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="SocialFlow" />
      </head>
      <body
        className={`${inter.variable} antialiased bg-background text-foreground overflow-x-hidden`}
        style={{ overscrollBehavior: "none", WebkitTapHighlightColor: "transparent" }}
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
