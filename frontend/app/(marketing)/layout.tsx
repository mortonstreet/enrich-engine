import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Enrich Engine | Lead Enrichment for Sales Teams",
  description:
    "Find LinkedIn profiles from names or companies. Enrich with verified emails and phone numbers. Build lead lists for outbound sales.",
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
