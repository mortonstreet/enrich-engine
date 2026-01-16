import { Metadata } from "next";

export const metadata: Metadata = {
  title: "EnrichEngine - Find Email & Phone from LinkedIn",
  description:
    "Find verified email addresses and phone numbers from any LinkedIn profile. Enrich your contacts with accurate data.",
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
