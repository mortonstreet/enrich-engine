export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  readTime: string;
  featured?: boolean;
}

export const blogPosts: BlogPost[] = [
  {
    slug: "power-dialing-101-complete-guide",
    title: "Power Dialer Software: The Complete Guide to Outbound Sales Automation",
    excerpt: "Power dialer technology transforms sales team productivity by automating sequential calling. Learn setup strategies, CRM integration best practices, and the outbound calling tactics that top SDRs use to triple their daily call volume.",
    category: "Sales Tactics",
    date: "January 20, 2026",
    readTime: "8 min read",
    featured: true,
  },
  {
    slug: "cold-calling-scripts-that-work",
    title: "Cold Calling Scripts for B2B Sales: 7 Frameworks That Book Meetings",
    excerpt: "Modern cold calling requires conversational frameworks, not robotic scripts. These proven openers and objection handlers help sales development reps book more qualified meetings.",
    category: "Sales Tactics",
    date: "January 18, 2026",
    readTime: "12 min read",
    featured: true,
  },
  {
    slug: "voicemail-drop-best-practices",
    title: "Voicemail Drop Technology: Crafting Messages That Drive Callbacks",
    excerpt: "Decision makers receive dozens of sales voicemails daily. Learn how pre-recorded voicemail drop saves time while increasing callback rates through strategic message design.",
    category: "Tips & Tricks",
    date: "January 15, 2026",
    readTime: "6 min read",
  },
  {
    slug: "sdr-daily-routine-top-performers",
    title: "SDR Productivity: How Top Sales Development Reps Structure Their Day",
    excerpt: "Research with 20 quota-crushing SDRs reveals the daily routines, calling blocks, and sales engagement habits that separate top performers from average reps.",
    category: "Productivity",
    date: "January 12, 2026",
    readTime: "10 min read",
  },
  {
    slug: "call-recording-coaching-tips",
    title: "Sales Call Recording: A Framework for Coaching High-Performance Teams",
    excerpt: "Call recording and conversation intelligence tools offer more than compliance protection. Discover how sales leaders use recorded calls to accelerate rep development and improve close rates.",
    category: "Sales Management",
    date: "January 10, 2026",
    readTime: "7 min read",
  },
  {
    slug: "connect-rate-optimization",
    title: "Outbound Connect Rates: How We Improved From 12 Percent to 34 Percent",
    excerpt: "A detailed case study on the data quality improvements, timing optimizations, and local presence dialing tactics that helped us nearly triple our outbound connect rates.",
    category: "Case Study",
    date: "January 8, 2026",
    readTime: "9 min read",
  },
  {
    slug: "local-presence-dialing-explained",
    title: "Local Presence Dialing: Increase Answer Rates With Area Code Matching",
    excerpt: "Prospects answer local numbers at nearly four times the rate of toll-free or out-of-state calls. Learn how local presence dialing works and when to implement it in your outbound strategy.",
    category: "Tips & Tricks",
    date: "January 5, 2026",
    readTime: "5 min read",
  },
  {
    slug: "crm-hygiene-sales-teams",
    title: "CRM Data Quality: The Revenue Impact of Clean Sales Data",
    excerpt: "Poor data quality costs sales organizations millions annually in wasted effort and inaccurate forecasting. Build systems and habits that maintain pipeline integrity.",
    category: "Sales Operations",
    date: "January 3, 2026",
    readTime: "8 min read",
  },
  {
    slug: "building-sales-culture-remote",
    title: "Remote Sales Teams: Building High-Performance Culture Without an Office",
    excerpt: "Distributed sales teams can match or exceed the energy of traditional sales floors. Learn the rituals, tools, and management practices that create accountability and connection.",
    category: "Sales Management",
    date: "January 1, 2026",
    readTime: "11 min read",
  },
];
