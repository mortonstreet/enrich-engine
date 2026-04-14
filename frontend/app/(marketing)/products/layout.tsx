import { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s | OmniDial",
    default: "Products | OmniDial",
  },
  description:
    "Explore OmniDial's products: Dialer for high-velocity sales teams and Enrich for lead enrichment.",
};

export default function ProductsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
