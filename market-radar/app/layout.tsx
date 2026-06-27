import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Market Radar Bestie",
  description:
    "Ephemeral market watch — assumptions, principles, public sources, structured digest.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
