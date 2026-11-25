import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Respond to your greeting card",
  description: "Send a personal reply — no account required.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default function RespondLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
