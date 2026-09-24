import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HomeLink — Clients for Life",
  description: "A client retention CRM for real estate professionals."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
