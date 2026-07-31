import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import Header from "@/components/Header";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const GA_ID = "G-2YHG89FY0N";
const TOOL_NAME = "crossroads";

const SITE_URL = "https://crossroads.policyengine.org";

export const metadata: Metadata = {
  title: "Crossroads | PolicyEngine - See How Life Events Affect Your Taxes & Benefits",
  description:
    "Use Crossroads by PolicyEngine to simulate how major life events like having a baby, getting married, moving states, or changing income affect your taxes, benefits, and net income.",
  keywords: [
    "tax calculator",
    "benefits calculator",
    "life event simulator",
    "PolicyEngine",
    "tax credits",
    "SNAP benefits",
    "Medicaid eligibility",
    "marriage tax impact",
    "having a baby tax benefits",
    "moving states taxes",
    "income change simulation",
    "benefit cliffs",
    "net income calculator",
  ],
  authors: [{ name: "PolicyEngine", url: "https://policyengine.org" }],
  creator: "PolicyEngine",
  publisher: "PolicyEngine",
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Crossroads | PolicyEngine",
    description:
      "Simulate how major life events affect your taxes, benefits, and net income. Free tool powered by PolicyEngine.",
    type: "website",
    url: SITE_URL,
    siteName: "Crossroads by PolicyEngine",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Crossroads | PolicyEngine",
    description:
      "Simulate how major life events affect your taxes, benefits, and net income.",
    creator: "@ThePolicyEngine",
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
  other: {
    "theme-color": "#319795",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Crossroads",
  description:
    "Simulate how major life events affect your taxes, benefits, and net income.",
  url: SITE_URL,
  applicationCategory: "FinanceApplication",
  operatingSystem: "Any",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  author: {
    "@type": "Organization",
    name: "PolicyEngine",
    url: "https://policyengine.org",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Header />
        <main>{children}</main>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          strategy="afterInteractive"
        />
        <Script id="gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}', { tool_name: '${TOOL_NAME}' });
          `}
        </Script>
        <Script id="engagement-tracking" strategy="afterInteractive">
          {`
            (function() {
              var TOOL_NAME = '${TOOL_NAME}';
              if (typeof window === 'undefined' || !window.gtag) return;

              var scrollFired = {};
              window.addEventListener('scroll', function() {
                var docHeight = document.documentElement.scrollHeight - window.innerHeight;
                if (docHeight <= 0) return;
                var pct = Math.floor((window.scrollY / docHeight) * 100);
                [25, 50, 75, 100].forEach(function(m) {
                  if (pct >= m && !scrollFired[m]) {
                    scrollFired[m] = true;
                    window.gtag('event', 'scroll_depth', { percent: m, tool_name: TOOL_NAME });
                  }
                });
              }, { passive: true });

              [30, 60, 120, 300].forEach(function(sec) {
                setTimeout(function() {
                  if (document.visibilityState !== 'hidden') {
                    window.gtag('event', 'time_on_tool', { seconds: sec, tool_name: TOOL_NAME });
                  }
                }, sec * 1000);
              });

              document.addEventListener('click', function(e) {
                var link = e.target && e.target.closest ? e.target.closest('a') : null;
                if (!link || !link.href) return;
                try {
                  var url = new URL(link.href, window.location.origin);
                  if (url.hostname && url.hostname !== window.location.hostname) {
                    window.gtag('event', 'outbound_click', {
                      url: link.href,
                      target_hostname: url.hostname,
                      tool_name: TOOL_NAME
                    });
                  }
                } catch (err) {}
              });
            })();
          `}
        </Script>
      </body>
    </html>
  );
}
