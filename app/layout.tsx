import type { Metadata } from "next";
import { AppProviders } from "@/providers/app-providers";
import { getAppUrl } from "@/lib/app-url";
import "./globals.css";

const siteTitle = "Everlia — Turn Every Client Into a Client for Life";
const siteDescription =
  "Automated client retention CRM keeping every client relationship alive long after the transaction ends.";

export const metadata: Metadata = {
  metadataBase: new URL(getAppUrl()),
  title: siteTitle,
  description: siteDescription,
  applicationName: "Everlia",
  icons: {
    icon: "/brand/everlia-logo.png",
    apple: "/brand/everlia-logo.png",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Everlia",
    title: siteTitle,
    description: siteDescription,
    url: "/",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Everlia — Turn Every Client Into a Client for Life",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: ["/og-image.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
