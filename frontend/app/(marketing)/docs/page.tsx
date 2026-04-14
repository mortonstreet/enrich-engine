"use client";

import Link from "next/link";
import {
  Book,
  Zap,
  Settings,
  Users,
  BarChart3,
  Phone,
  Mic,
  Kanban,
  Target,
  UserPlus,
  CreditCard,
  FolderOpen,
  Search,
  ChevronDown,
  HelpCircle
} from "lucide-react";
import DarkNavigation from "@/components/landing/DarkNavigation";
import DarkFooter from "@/components/landing/DarkFooter";
import DarkScrollReveal from "@/components/landing/DarkScrollReveal";
import { OmniDialLogoStatic } from "@/components/landing/OmniDialLogo";
import { useState } from "react";

interface HelpSection {
  id: string;
  title: string;
  icon: React.ElementType;
  content: React.ReactNode;
}

const helpSections: HelpSection[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: Zap,
    content: (
      <div className="space-y-6">
        <div>
          <h4 className="font-semibold text-white mb-2">1. Create Your Account</h4>
          <p className="text-white/60 text-sm leading-relaxed">
            Sign up at omnidial.io with your email address. You&apos;ll receive a verification email to confirm your account.
            Once verified, you can log in and start setting up your dialer.
          </p>
        </div>
        <div>
          <h4 className="font-semibold text-white mb-2">2. Connect Your Phone Number</h4>
          <p className="text-white/60 text-sm leading-relaxed">
            Navigate to <strong className="text-white/80">Settings → Dialer</strong> to configure your Twilio account.
            Enter your Twilio Account SID and Auth Token, then purchase or connect a phone number. This number will be used
            as your caller ID when making outbound calls.
          </p>
        </div>
        <div>
          <h4 className="font-semibold text-white mb-2">3. Import Your Contacts</h4>
          <p className="text-white/60 text-sm leading-relaxed">
            Go to <strong className="text-white/80">Leads</strong> or <strong className="text-white/80">Lists</strong> to import your contacts.
            You can upload a CSV file with columns for name, email, phone, company, and title. Our column mapper will help you
            match your CSV columns to the correct fields.
          </p>
        </div>
        <div>
          <h4 className="font-semibold text-white mb-2">4. Make Your First Call</h4>
          <p className="text-white/60 text-sm leading-relaxed">
            Head to the <strong className="text-white/80">Dialer</strong> tab and select Manual Dialer. Enter a phone number
            or select a lead from your list, then click the call button. Make sure your browser has microphone permissions enabled.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "dialer",
    title: "Using the Dialer",
    icon: Phone,
    content: (
      <div className="space-y-6">
        <div>
          <h4 className="font-semibold text-white mb-2">Manual Dialer</h4>
          <p className="text-white/60 text-sm leading-relaxed mb-3">
            The Manual Dialer lets you make individual calls with full control. Use the keypad to enter a number or
            select a lead from your contacts. During calls, you have access to:
          </p>
          <ul className="text-white/60 text-sm space-y-1 list-disc list-inside ml-2">
            <li><strong className="text-white/80">Mute/Unmute</strong> – Toggle your microphone</li>
            <li><strong className="text-white/80">Keypad</strong> – Send DTMF tones during the call</li>
            <li><strong className="text-white/80">End Call</strong> – Hang up the current call</li>
            <li><strong className="text-white/80">Voicemail Drop</strong> – Leave a pre-recorded voicemail</li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-white mb-2">Power Dialer</h4>
          <p className="text-white/60 text-sm leading-relaxed mb-3">
            Power Dialer automatically advances through your lead list, saving time between calls. To use it:
          </p>
          <ol className="text-white/60 text-sm space-y-2 list-decimal list-inside ml-2">
            <li>Select a campaign or list to dial from</li>
            <li>Click <strong className="text-white/80">Start Dialing</strong> to begin</li>
            <li>After each call ends, set the disposition</li>
            <li>The dialer automatically moves to the next lead</li>
            <li>Use <strong className="text-white/80">Skip</strong> to bypass a lead or <strong className="text-white/80">Previous</strong> to go back</li>
          </ol>
        </div>
        <div>
          <h4 className="font-semibold text-white mb-2">Inbound Calls</h4>
          <p className="text-white/60 text-sm leading-relaxed">
            When someone calls your OmniDial number, you&apos;ll see an incoming call notification. The system will
            automatically match the caller ID to any existing leads in your database, showing you their profile
            before you answer.
          </p>
        </div>
        <div>
          <h4 className="font-semibold text-white mb-2">Call History</h4>
          <p className="text-white/60 text-sm leading-relaxed">
            Access your complete call history from the <strong className="text-white/80">History</strong> tab in the Dialer.
            Filter by date, duration, or outcome. Click any call to view details, play recordings, or see the associated lead.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "campaigns",
    title: "Campaign Management",
    icon: Target,
    content: (
      <div className="space-y-6">
        <div>
          <h4 className="font-semibold text-white mb-2">Creating a Campaign</h4>
          <p className="text-white/60 text-sm leading-relaxed mb-3">
            Campaigns help you organize outreach efforts around specific goals. To create one:
          </p>
          <ol className="text-white/60 text-sm space-y-2 list-decimal list-inside ml-2">
            <li>Go to <strong className="text-white/80">Campaigns</strong> and click <strong className="text-white/80">New Campaign</strong></li>
            <li>Enter a name and description</li>
            <li>Choose campaign type: <strong className="text-white/80">Personal</strong> (just you) or <strong className="text-white/80">Team</strong> (round-robin assignment)</li>
            <li>Import leads via CSV or add from your existing lead database</li>
          </ol>
        </div>
        <div>
          <h4 className="font-semibold text-white mb-2">Importing Leads to Campaigns</h4>
          <p className="text-white/60 text-sm leading-relaxed mb-3">
            Drag and drop a CSV file onto the campaign page to import leads. You&apos;ll see a column mapping interface where you can:
          </p>
          <ul className="text-white/60 text-sm space-y-1 list-disc list-inside ml-2">
            <li>Match CSV columns to OmniDial fields (name, email, phone, company, etc.)</li>
            <li>Preview the data before importing</li>
            <li>Skip columns you don&apos;t need</li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-white mb-2">Campaign Status</h4>
          <p className="text-white/60 text-sm leading-relaxed">
            Track each campaign&apos;s progress with built-in metrics: total leads, leads dialed, connections made,
            and conversion rates. Pause campaigns at any time and resume when ready.
          </p>
        </div>
        <div>
          <h4 className="font-semibold text-white mb-2">Dialing from a Campaign</h4>
          <p className="text-white/60 text-sm leading-relaxed">
            Open a campaign and click <strong className="text-white/80">Start Power Dialer</strong> to begin calling through the lead list.
            The Power Dialer will only dial leads that haven&apos;t been contacted yet in this campaign.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "leads",
    title: "Lead Management",
    icon: Users,
    content: (
      <div className="space-y-6">
        <div>
          <h4 className="font-semibold text-white mb-2">Lead Database</h4>
          <p className="text-white/60 text-sm leading-relaxed">
            The <strong className="text-white/80">Leads</strong> page is your central contact database. View, search, and filter
            all your contacts in one place. Each lead stores standard fields (name, email, phone, company, title, LinkedIn)
            plus any custom fields you define.
          </p>
        </div>
        <div>
          <h4 className="font-semibold text-white mb-2">Adding Leads</h4>
          <p className="text-white/60 text-sm leading-relaxed mb-3">
            Add leads in several ways:
          </p>
          <ul className="text-white/60 text-sm space-y-1 list-disc list-inside ml-2">
            <li><strong className="text-white/80">Manual Entry</strong> – Click &quot;Add Lead&quot; and fill in the details</li>
            <li><strong className="text-white/80">CSV Import</strong> – Bulk upload from a spreadsheet</li>
            <li><strong className="text-white/80">During Calls</strong> – Create leads on the fly from the dialer</li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-white mb-2">Lead Details</h4>
          <p className="text-white/60 text-sm leading-relaxed">
            Click any lead to open their detail panel. Here you&apos;ll find their complete call history with recordings,
            notes and activity timeline, tasks and reminders, and CRM pipeline stage.
          </p>
        </div>
        <div>
          <h4 className="font-semibold text-white mb-2">Search and Filter</h4>
          <p className="text-white/60 text-sm leading-relaxed">
            Use the search bar to find leads by name, email, phone, or company. Apply filters to narrow results by
            stage, tags, last activity date, or custom fields.
          </p>
        </div>
        <div>
          <h4 className="font-semibold text-white mb-2">Bulk Actions</h4>
          <p className="text-white/60 text-sm leading-relaxed">
            Select multiple leads with checkboxes to perform bulk operations: add to campaign, add to CRM pipeline,
            export to CSV, or delete.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "lists",
    title: "Lists & Folders",
    icon: FolderOpen,
    content: (
      <div className="space-y-6">
        <div>
          <h4 className="font-semibold text-white mb-2">Organizing with Lists</h4>
          <p className="text-white/60 text-sm leading-relaxed">
            Lists let you group leads for specific purposes – like an event attendee list, a geographic territory,
            or leads from a particular source. Unlike campaigns, lists are persistent collections you can reuse.
          </p>
        </div>
        <div>
          <h4 className="font-semibold text-white mb-2">Creating Lists</h4>
          <p className="text-white/60 text-sm leading-relaxed mb-3">
            Go to <strong className="text-white/80">Lists</strong> and click <strong className="text-white/80">New List</strong>.
            Give it a name and optionally assign it to a folder. You can:
          </p>
          <ul className="text-white/60 text-sm space-y-1 list-disc list-inside ml-2">
            <li>Import leads via CSV with drag-and-drop</li>
            <li>Add existing leads from your database</li>
            <li>Edit lead data directly in the list view</li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-white mb-2">Folder Organization</h4>
          <p className="text-white/60 text-sm leading-relaxed">
            Create folders to organize your lists by client, territory, or any structure that works for you.
            Drag lists between folders to reorganize.
          </p>
        </div>
        <div>
          <h4 className="font-semibold text-white mb-2">Exporting Lists</h4>
          <p className="text-white/60 text-sm leading-relaxed">
            Export any list to CSV by clicking the export button. This includes all lead data and any notes
            you&apos;ve added.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "crm",
    title: "CRM Pipeline",
    icon: Kanban,
    content: (
      <div className="space-y-6">
        <div>
          <h4 className="font-semibold text-white mb-2">Pipeline Overview</h4>
          <p className="text-white/60 text-sm leading-relaxed">
            The CRM provides a visual Kanban-style board for managing your sales pipeline. Drag leads between
            stages as they progress through your sales process.
          </p>
        </div>
        <div>
          <h4 className="font-semibold text-white mb-2">Default Stages</h4>
          <p className="text-white/60 text-sm leading-relaxed mb-3">
            Your pipeline includes these stages by default:
          </p>
          <ul className="text-white/60 text-sm space-y-1 list-disc list-inside ml-2">
            <li><strong className="text-white/80">New</strong> – Freshly added leads</li>
            <li><strong className="text-white/80">Contacted</strong> – Initial outreach made</li>
            <li><strong className="text-white/80">Qualified</strong> – Confirmed fit and interest</li>
            <li><strong className="text-white/80">Meeting</strong> – Demo or meeting scheduled</li>
            <li><strong className="text-white/80">Proposal</strong> – Proposal or quote sent</li>
            <li><strong className="text-white/80">Closed Won</strong> – Deal won</li>
            <li><strong className="text-white/80">Closed Lost</strong> – Deal lost</li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-white mb-2">Working with Deal Cards</h4>
          <p className="text-white/60 text-sm leading-relaxed">
            Each card shows the lead&apos;s name, company, deal value, and last activity. Click a card to open the
            full lead detail panel with call history, notes, and tasks. Drag cards between columns to update their stage.
          </p>
        </div>
        <div>
          <h4 className="font-semibold text-white mb-2">Adding Leads to Pipeline</h4>
          <p className="text-white/60 text-sm leading-relaxed">
            Add leads to your pipeline from the Leads page using bulk select, or click &quot;Add to Pipeline&quot; from
            any lead detail view. You can also create new leads directly in the CRM.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "recordings",
    title: "Call Recording",
    icon: Mic,
    content: (
      <div className="space-y-6">
        <div>
          <h4 className="font-semibold text-white mb-2">Automatic Recording</h4>
          <p className="text-white/60 text-sm leading-relaxed">
            All calls are automatically recorded and stored securely. Recordings appear in call history and on
            the lead&apos;s detail page. A recording indicator shows during active calls.
          </p>
        </div>
        <div>
          <h4 className="font-semibold text-white mb-2">Accessing Recordings</h4>
          <p className="text-white/60 text-sm leading-relaxed mb-3">
            Find recordings in several places:
          </p>
          <ul className="text-white/60 text-sm space-y-1 list-disc list-inside ml-2">
            <li><strong className="text-white/80">Dialer → History</strong> – All your recent calls</li>
            <li><strong className="text-white/80">Lead Detail</strong> – All calls with that specific contact</li>
            <li><strong className="text-white/80">Dashboard</strong> – Recent activity feed</li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-white mb-2">Playback Controls</h4>
          <p className="text-white/60 text-sm leading-relaxed">
            Click the play button on any call record to listen. Use the progress bar to skip ahead or rewind.
            Playback speed controls let you review calls faster.
          </p>
        </div>
        <div>
          <h4 className="font-semibold text-white mb-2">Voicemail Drops</h4>
          <p className="text-white/60 text-sm leading-relaxed">
            Pre-record voicemail messages in Settings → Dialer. During a call, click the voicemail drop button
            to leave your pre-recorded message and move on to the next call.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "analytics",
    title: "Analytics & Reporting",
    icon: BarChart3,
    content: (
      <div className="space-y-6">
        <div>
          <h4 className="font-semibold text-white mb-2">Dashboard Overview</h4>
          <p className="text-white/60 text-sm leading-relaxed">
            Your dashboard shows real-time call metrics at a glance: total calls, connected calls (with connection rate),
            total talk time, and average call duration.
          </p>
        </div>
        <div>
          <h4 className="font-semibold text-white mb-2">Key Metrics</h4>
          <ul className="text-white/60 text-sm space-y-1 list-disc list-inside ml-2">
            <li><strong className="text-white/80">Total Calls</strong> – Outbound + inbound attempts</li>
            <li><strong className="text-white/80">Connected Calls</strong> – Calls answered by a human</li>
            <li><strong className="text-white/80">Connection Rate</strong> – Percentage of calls answered</li>
            <li><strong className="text-white/80">Talk Time</strong> – Total time spent on calls</li>
            <li><strong className="text-white/80">Average Duration</strong> – Average length per call</li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-white mb-2">Charts & Visualizations</h4>
          <p className="text-white/60 text-sm leading-relaxed">
            View calls over time with line charts, disposition breakdowns with pie charts, and team performance
            comparisons. Filter by date range (Today, This Week, This Month, Custom) and by team member.
          </p>
        </div>
        <div>
          <h4 className="font-semibold text-white mb-2">Activity Feed</h4>
          <p className="text-white/60 text-sm leading-relaxed">
            The activity feed shows recent actions across your account: calls made, leads created, tasks completed,
            and more. Click any item to see details.
          </p>
        </div>
        <div>
          <h4 className="font-semibold text-white mb-2">Exporting Data</h4>
          <p className="text-white/60 text-sm leading-relaxed">
            Export your analytics data to CSV for further analysis or reporting. Click the export button on any
            chart or table to download.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "team",
    title: "Team Management",
    icon: UserPlus,
    content: (
      <div className="space-y-6">
        <div>
          <h4 className="font-semibold text-white mb-2">Inviting Team Members</h4>
          <p className="text-white/60 text-sm leading-relaxed mb-3">
            Go to <strong className="text-white/80">Settings → Team</strong> to manage your organization:
          </p>
          <ol className="text-white/60 text-sm space-y-2 list-decimal list-inside ml-2">
            <li>Click <strong className="text-white/80">Invite Member</strong></li>
            <li>Enter their email address</li>
            <li>Select a role: <strong className="text-white/80">Admin</strong> or <strong className="text-white/80">Rep</strong></li>
            <li>They&apos;ll receive an email invitation to join</li>
          </ol>
        </div>
        <div>
          <h4 className="font-semibold text-white mb-2">User Roles</h4>
          <ul className="text-white/60 text-sm space-y-1 list-disc list-inside ml-2">
            <li><strong className="text-white/80">Admin</strong> – Full access including settings, billing, and team management</li>
            <li><strong className="text-white/80">Rep</strong> – Access to dialer, leads, campaigns, and CRM. Cannot change settings or manage team.</li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-white mb-2">Sales Floor</h4>
          <p className="text-white/60 text-sm leading-relaxed">
            The <strong className="text-white/80">Sales Floor</strong> view (Admins only) shows real-time team activity.
            See who&apos;s on a call, call duration, and today&apos;s metrics for each team member.
          </p>
        </div>
        <div>
          <h4 className="font-semibold text-white mb-2">Team Campaigns</h4>
          <p className="text-white/60 text-sm leading-relaxed">
            When creating a campaign, choose &quot;Team&quot; type to distribute leads across your team with round-robin
            assignment. Each rep dials their assigned portion.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "settings",
    title: "Settings & Configuration",
    icon: Settings,
    content: (
      <div className="space-y-6">
        <div>
          <h4 className="font-semibold text-white mb-2">Account Settings</h4>
          <p className="text-white/60 text-sm leading-relaxed">
            Update your profile information, change your password, and manage notification preferences in
            <strong className="text-white/80"> Settings → Account</strong>.
          </p>
        </div>
        <div>
          <h4 className="font-semibold text-white mb-2">Dialer Settings</h4>
          <p className="text-white/60 text-sm leading-relaxed mb-3">
            Configure your phone system in <strong className="text-white/80">Settings → Dialer</strong>:
          </p>
          <ul className="text-white/60 text-sm space-y-1 list-disc list-inside ml-2">
            <li><strong className="text-white/80">Twilio Credentials</strong> – Enter your Account SID and Auth Token</li>
            <li><strong className="text-white/80">Phone Numbers</strong> – Purchase new numbers or connect existing ones</li>
            <li><strong className="text-white/80">Device Registration</strong> – Register your browser for calls</li>
            <li><strong className="text-white/80">Voicemail Drops</strong> – Record and manage voicemail messages</li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-white mb-2">Billing</h4>
          <p className="text-white/60 text-sm leading-relaxed">
            Manage your subscription in <strong className="text-white/80">Settings → Billing</strong>. View your current plan,
            update payment methods, and see usage statistics. Additional phone numbers are $5/month each.
          </p>
        </div>
        <div>
          <h4 className="font-semibold text-white mb-2">Browser Permissions</h4>
          <p className="text-white/60 text-sm leading-relaxed">
            OmniDial needs microphone access to make calls. When prompted, click &quot;Allow&quot; to grant permission.
            If you accidentally denied access, you can reset it in your browser settings.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "billing",
    title: "Billing & Plans",
    icon: CreditCard,
    content: (
      <div className="space-y-6">
        <div>
          <h4 className="font-semibold text-white mb-2">Available Plans</h4>
          <ul className="text-white/60 text-sm space-y-3 ml-2">
            <li>
              <strong className="text-white/80">Starter</strong> – Perfect for individuals and small teams getting started with outbound calling.
            </li>
            <li>
              <strong className="text-white/80">Pro</strong> – Advanced features including parallel dialer, team analytics, and priority support.
            </li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-white mb-2">Managing Your Subscription</h4>
          <p className="text-white/60 text-sm leading-relaxed">
            Go to <strong className="text-white/80">Settings → Billing</strong> to view your current plan, update payment
            information, or change plans. You&apos;ll be redirected to our secure payment portal.
          </p>
        </div>
        <div>
          <h4 className="font-semibold text-white mb-2">Usage-Based Costs</h4>
          <p className="text-white/60 text-sm leading-relaxed">
            Call minutes are billed through your connected Twilio account at Twilio&apos;s standard rates.
            Additional phone numbers through OmniDial are $5/month each.
          </p>
        </div>
        <div>
          <h4 className="font-semibold text-white mb-2">Cancellation</h4>
          <p className="text-white/60 text-sm leading-relaxed">
            You can cancel your subscription at any time from the billing page. Your access continues until
            the end of the current billing period.
          </p>
        </div>
      </div>
    ),
  },
];

function AccordionItem({ section, isOpen, onToggle }: { section: HelpSection; isOpen: boolean; onToggle: () => void }) {
  const Icon = section.icon;

  return (
    <div className="border border-white/10 rounded-xl overflow-hidden bg-[#111111]">
      <button
        onClick={onToggle}
        className="w-full px-6 py-5 flex items-center gap-4 text-left hover:bg-white/5 transition-colors"
      >
        <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-white/60" />
        </div>
        <span className="font-semibold text-white flex-1">{section.title}</span>
        <ChevronDown
          className={`w-5 h-5 text-white/40 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && (
        <div className="px-6 pb-6 pt-2 border-t border-white/5">
          {section.content}
        </div>
      )}
    </div>
  );
}

export default function HelpPage() {
  const [openSection, setOpenSection] = useState<string>("getting-started");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSections = helpSections.filter(section =>
    searchQuery === "" ||
    section.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen text-white bg-[#0a0a0a]">
      <DarkNavigation />

      <div className="relative z-10 bg-[#0a0a0a] pt-16">
        <main>
          {/* Hero */}
          <section className="py-16 sm:py-20">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
              <DarkScrollReveal>
                <div className="flex items-center justify-center gap-3 mb-8">
                  <OmniDialLogoStatic size={40} color="#fafafa" />
                  <span className="text-2xl font-semibold">OmniDial</span>
                </div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl tracking-tight mb-4 heading-display">
                  Help Center
                </h1>
                <p className="text-white/50 text-lg max-w-2xl mx-auto mb-8">
                  Everything you need to get the most out of OmniDial. Learn how to make calls,
                  manage leads, track analytics, and grow your sales.
                </p>

                {/* Search */}
                <div className="max-w-xl mx-auto relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                  <input
                    type="text"
                    placeholder="Search help topics..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-6 py-4 bg-[#111111] border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-white/20"
                  />
                </div>
              </DarkScrollReveal>
            </div>
          </section>

          {/* Quick Links */}
          <section className="py-8 border-t border-white/5">
            <div className="max-w-6xl mx-auto px-4 sm:px-6">
              <DarkScrollReveal>
                <h2 className="text-lg font-semibold mb-4">Quick links</h2>
                <div className="flex flex-wrap gap-2">
                  {[
                    { title: "Make your first call", id: "getting-started" },
                    { title: "Import contacts from CSV", id: "leads" },
                    { title: "Set up Power Dialer", id: "dialer" },
                    { title: "Create a campaign", id: "campaigns" },
                    { title: "Invite team members", id: "team" },
                  ].map((link) => (
                    <button
                      key={link.title}
                      onClick={() => {
                        setOpenSection(link.id);
                        setSearchQuery("");
                        document.getElementById(link.id)?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full text-sm text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                    >
                      <Book className="w-3 h-3" />
                      {link.title}
                    </button>
                  ))}
                </div>
              </DarkScrollReveal>
            </div>
          </section>

          {/* Help Sections */}
          <section className="py-12 sm:py-16">
            <div className="max-w-4xl mx-auto px-4 sm:px-6">
              <div className="space-y-4">
                {filteredSections.map((section) => (
                  <div key={section.id} id={section.id}>
                    <DarkScrollReveal>
                      <AccordionItem
                        section={section}
                        isOpen={openSection === section.id}
                        onToggle={() => setOpenSection(openSection === section.id ? "" : section.id)}
                      />
                    </DarkScrollReveal>
                  </div>
                ))}
              </div>

              {filteredSections.length === 0 && (
                <div className="text-center py-12">
                  <HelpCircle className="w-12 h-12 text-white/20 mx-auto mb-4" />
                  <p className="text-white/50">No help topics found for &quot;{searchQuery}&quot;</p>
                  <button
                    onClick={() => setSearchQuery("")}
                    className="mt-4 text-white/70 hover:text-white underline text-sm"
                  >
                    Clear search
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Still Need Help */}
          <section className="py-12 sm:py-16 border-t border-white/5">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
              <DarkScrollReveal>
                <h2 className="text-2xl font-semibold mb-4">Still need help?</h2>
                <p className="text-white/50 mb-6">
                  Our support team is here to help you get the most out of OmniDial.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <Link
                    href="/contact"
                    className="px-6 py-3 bg-white text-black rounded-xl font-medium hover:bg-white/90 transition-colors"
                  >
                    Contact support
                  </Link>
                  <Link
                    href="/faq"
                    className="px-6 py-3 bg-white/10 text-white rounded-xl font-medium hover:bg-white/20 transition-colors"
                  >
                    View FAQ
                  </Link>
                </div>
              </DarkScrollReveal>
            </div>
          </section>
        </main>
      </div>

      <DarkFooter />
    </div>
  );
}
