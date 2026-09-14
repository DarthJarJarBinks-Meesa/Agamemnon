import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const SITE_URL = "https://www.agamemnonai.org";

const ibmSans = IBM_Plex_Sans({
  variable: "--font-ibm",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const ibmMono = IBM_Plex_Mono({
  variable: "--font-ibm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Agamemnon AI | Offline Patent Intelligence",
    template: "%s | Agamemnon AI",
  },
  description:
    "Agamemnon provides offline patent intelligence for USPTO examination, including prior-art search, patent classification, and streamlined patent review.",
  keywords: [
    "Agamemnon",
    "USPTO",
    "patent intelligence",
    "prior art",
    "patent examination",
    "patent classification",
    "offline AI",
  ],
  authors: [{ name: "Agamemnon" }],
  creator: "Agamemnon",
  publisher: "Agamemnon",
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "Agamemnon AI",
    title: "Agamemnon AI | Offline Patent Intelligence",
    description:
      "Agamemnon provides offline patent intelligence for USPTO examination, including prior-art search, patent classification, and streamlined patent review.",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Agamemnon AI",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Agamemnon AI | Offline Patent Intelligence",
    description:
      "Agamemnon provides offline patent intelligence for USPTO examination, including prior-art search, patent classification, and streamlined patent review.",
    images: ["/og.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${ibmSans.variable} ${ibmMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-bg text-fg font-sans">{children}</body>
    </html>
  );
}
