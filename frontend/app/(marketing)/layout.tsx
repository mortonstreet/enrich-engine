import { Metadata } from "next";

export const metadata: Metadata = {
  title: "OmniDial | Sales Dialer Built for Closers",
  description:
    "Browser-based VoIP sales dialer. Power dial, click-to-call, call recording, voicemail drop, and built-in CRM. Built for SDRs who close.",
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
