import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

const siteUrl = "https://india-standards.significanthobbies.com";
const title = "India Standards — demographic calculator";
const description =
  "A playful experiment for exploring demographic standards with visible uncertainty.";
const socialImage =
  "https://raw.githubusercontent.com/Significant-Hobbies/india-standards/main/artifacts/design/review/after-1440.png";
const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "India Standards",
  applicationCategory: "LifestyleApplication",
  operatingSystem: "Web",
  url: siteUrl,
  image: socialImage,
  description,
  sameAs: ["https://github.com/Significant-Hobbies/india-standards"],
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: "India Standards",
    url: "/",
    title,
    description,
    images: [
      {
        url: socialImage,
        alt: "India Standards demographic calculator workbench",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [socialImage],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
