import type { Metadata, Viewport } from "next";
import { SITE_URL } from "@/lib/seo/metadata";
import "./globals.css";
import "./local-fonts.css";
import { Toaster } from "@/components/ui/sonner";
import { QueryProvider } from "@/lib/query-client";
import { GlobalDropZone } from "@/components/GlobalDropZone";
import { PathTracker } from "@/components/landing/GoBackButton";
import { getRootJsonLd } from "@/lib/seo/json-ld";
import { PRODUCT_FACTS, atLeast } from "@/lib/seo/product-facts";

export const metadata: Metadata = {
  title: {
    default: "Screenshot Studio - Screenshot Beautifier & Mockup Maker",
    template: "%s | Screenshot Studio",
  },
  // Add your Google Search Console verification code here
  // Get it from: https://search.google.com/search-console
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || "",
    // yandex: "your-yandex-verification",
    // bing: "your-bing-verification",
  },
  description:
    "Free screenshot editor and mockup maker. Add gradient backgrounds, browser frames, shadows, 3D effects, and animations to screenshots in seconds. No signup.",
  keywords: [
    // Primary keywords
    "screenshot editor online free",
    "free screenshot editor",
    "online screenshot editor",
    "screenshot beautifier",
    "screenshot editor",
    "screenshot studio",
    "free image editor",
    "online image editor",
    // Competitor & alternative keywords
    "pika style alternative",
    "shots.so alternative",
    "screenshot mockup tool",
    "browser mockup generator",
    "window mockup generator",
    "screenshot wrapper",
    "mockup screenshot",
    "mockup online",
    "mockup screen",
    "mockups ui",
    "mockup ui ux",
    "app mockup generator",
    "ui mockup generator",
    "shots app alternative",
    "shots net alternative",
    "moqups alternative",
    "previewed app alternative",
    "appshots alternative",
    "goodmockups alternative",
    "mockup me alternative",
    "screenshot editor online free",
    "best screenshot editor online",
    "screenshot editor without watermark",
    "screenshot editor online free without watermark",
    "screenshot editor no download",
    "uizard screenshot editor alternative",
    "mockup generator",
    "free mockup generator",
    "mockup generator free",
    "mockup online generator",
    "mockup online editor",
    "mockup editor online free",
    "mockup design online",
    "mockup free online",
    "free online mockup generator no watermark",
    "free mockup generator without watermark",
    "app mockup generator",
    "website mockup generator",
    "free website mockup generator",
    "website mockup generator from url",
    "laptop mockup generator",
    "product mockup generator",
    "free online 3d mockup generator",
    "best mockup generator",
    "best online mockup generator",
    "mockup app",
    // Feature keywords
    "social media graphics maker",
    "image background editor",
    "screenshot animation maker",
    "browser frame screenshot",
    "screenshot with gradient background",
    "mac window screenshot mockup",
    // Use case keywords
    "product screenshot tool",
    "SaaS screenshot maker",
    "app screenshot maker",
    "developer portfolio images",
    "Twitter card generator",
    "Instagram post creator",
    "LinkedIn banner maker",
    // Long-tail keywords
    "free design tool no signup",
    "beautify screenshots online",
    "add background to screenshot",
    "screenshot to video converter",
    "screenshot padding and shadow tool",
    "screenshot border radius editor",
    "free online screenshot beautifier",
    "image presentation maker",
  ],
  authors: [
    { name: "Screenshot Studio", url: "https://www.screenshot-studio.com" },
  ],
  creator: "Screenshot Studio",
  publisher: "Screenshot Studio",
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "Screenshot Studio",
    title: "Screenshot Studio - Free Screenshot Editor Online",
    description:
      `Free screenshot editor online: create stunning social media graphics in seconds. ${atLeast(PRODUCT_FACTS.backgrounds)} backgrounds, animations, 3D effects, video export. No signup required.`,
    images: [
      {
        url: "https://www.screenshot-studio.com/og.jpg",
        width: 1200,
        height: 630,
        alt: "Screenshot Studio - Transform Screenshots into Professional Graphics",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Screenshot Studio - Free Screenshot Editor Online",
    description:
      "Free screenshot editor online: transform screenshots into stunning graphics. Animations, 3D effects, video export. No signup.",
    images: ["https://www.screenshot-studio.com/og.jpg"],
    creator: "@screenshotstdio",
    site: "@screenshotstdio",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.svg?v=10", type: "image/svg+xml" },
      { url: "/favicon-96x96.png?v=10", type: "image/png", sizes: "96x96" },
      { url: "/favicon-32x32.png?v=10", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16x16.png?v=10", type: "image/png", sizes: "16x16" },
      { url: "/favicon.ico?v=10", sizes: "16x16 32x32 48x48" },
    ],
    shortcut: "/favicon.ico?v=10",
    apple: [{ url: "/apple-touch-icon.png?v=10", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/site.webmanifest",
  category: "Design Tools",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const rootJsonLd = getRootJsonLd();

  return (
    <html lang="en" className="dark">
      <meta name="msvalidate.01" content="A3B8CB50BBD78710971A13FA3EE1E544" />
      <link
        rel="alternate"
        type="text/markdown"
        href="/llms.txt"
        title="LLMs.txt"
      />
      <link
        rel="alternate"
        type="text/markdown"
        href="/llms-full.txt"
        title="LLMs Full Documentation"
      />
      <body className={`antialiased`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(rootJsonLd) }}
        />
        <QueryProvider>
          <GlobalDropZone>
            <PathTracker />
            {children}
          </GlobalDropZone>
          <Toaster />
        </QueryProvider>
      </body>
    </html>
  );
}
