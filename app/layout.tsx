import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://india-standards.significanthobbies.com"),
  title: "India Standards — demographic calculator",
  description:
    "A playful experiment for exploring demographic standards with visible uncertainty.",
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
