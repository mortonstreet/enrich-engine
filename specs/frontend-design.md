# Frontend Design Spec

**Module Owner:** This session
**Status:** Complete
**Dependencies:** None (can run in parallel)

---

## Implementation Status

### Marketing Site
- [x] Landing page (copy GTM Dialer structure)
- [x] Hero section with "Scrape" headline
- [x] Stats section (4 metrics)
- [x] Features bento grid (6 cards)
- [x] How it works section (3 steps)
- [x] CTA section with waitlist
- [x] Footer with links
- [x] Waitlist page

### App Dashboard
- [x] Light mode theme setup
- [x] Sidebar navigation (Scrape, Lists, Enrich, Settings)
- [x] Page layouts
- [x] Component styling

### Key Files
**Marketing:**
- `frontend/app/page.tsx` - Re-exports marketing landing page
- `frontend/app/(marketing)/page.tsx` - Landing page with Scrape hero
- `frontend/app/(marketing)/waitlist/page.tsx` - Waitlist page
- `frontend/app/(marketing)/layout.tsx` - Marketing layout with metadata

**Theme:**
- `frontend/theme.config.ts` - Light mode color palette
- `frontend/app/globals.css` - Global styles with animations

**Dashboard:**
- `frontend/app/dashboard/layout.tsx` - Dashboard layout
- `frontend/components/dashboard/Sidebar.tsx` - Navigation (Scrape, Lists, Enrich, Settings)

---

## Overview

The frontend design spec defines the visual design system for Enrich Engine, including the marketing site and app dashboard. The design follows a light mode, minimal aesthetic with clean typography and subtle shadows.

### Design Direction
- Light mode primary (with optional dark mode)
- Clean/modern SaaS aesthetic
- Lots of white space
- Subtle shadows and borders
- Professional typography
- Copy GTM Dialer landing page structure exactly (change copy)

### Implementation
Use the `frontend-design` skill for actual design implementation.

---

## Branding

| Element | Value |
|---------|-------|
| **Product Name** | Enrich Engine |
| **Tagline** | Find LinkedIn profiles. Enrich with emails & phones. Build lead lists. |
| **Page Title** | Enrich Engine \| Lead Enrichment for Sales Teams |
| **Meta Description** | Find LinkedIn profiles from names or companies. Enrich with verified emails and phone numbers. Build lead lists for outbound sales. |

---

## Color Palette (Light Mode)

```css
:root {
  /* Backgrounds */
  --background: #ffffff;           /* Pure white */
  --background-muted: #f9fafb;     /* Slight grey for sections */
  --background-elevated: #ffffff;  /* Cards, modals */

  /* Foregrounds */
  --foreground: #111827;           /* Primary text - near black */
  --foreground-muted: #6b7280;     /* Secondary text */
  --foreground-subtle: #9ca3af;    /* Tertiary text */

  /* Borders */
  --border: #e5e7eb;               /* Default borders */
  --border-focus: #d1d5db;         /* Focus state borders */

  /* Primary (Brand) */
  --primary: #111827;              /* Black buttons */
  --primary-foreground: #ffffff;   /* White text on primary */

  /* Accent */
  --accent: #3b82f6;               /* Blue for links, active states */
  --accent-muted: #eff6ff;         /* Light blue backgrounds */

  /* Status */
  --success: #10b981;              /* Green */
  --warning: #f59e0b;              /* Amber */
  --error: #ef4444;                /* Red */

  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
}
```

---

## Typography

### Font Families
```css
/* Headlines & Body */
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* Marketing Headlines (optional) */
--font-display: 'Inter', sans-serif;

/* Code & Data */
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
```

### Font Sizes
```css
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */
--text-4xl: 2.25rem;   /* 36px */
--text-5xl: 3rem;      /* 48px */
--text-6xl: 3.75rem;   /* 60px */
--text-hero: clamp(4rem, 15vw, 12rem); /* Responsive hero */
```

### Font Weights
```css
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

---

## Marketing Site Copy

### Hero Section
```
Headline: "Scrape"
Tagline: "Find LinkedIn profiles. Enrich with emails & phones. Build lead lists."
CTA: "Join Waitlist" (with arrow icon)
```

### Stats Section (4 metrics)
| Value | Label |
|-------|-------|
| 95% | Email accuracy |
| 10x | Faster |
| 1000+ | Profiles/hour |
| $29 | Per month |

### Features Bento Grid (6 cards)

| Feature | Icon | Description |
|---------|------|-------------|
| **LinkedIn Scraper** | Search | "Upload names or companies. Get LinkedIn profile URLs." |
| **Email Finder** | Mail | "95% accuracy. Verified business emails." |
| **Phone Finder** | Phone | "Direct dials. Mobile numbers." |
| **CSV Export** | Download | "Download enriched lists. Ready for outreach." |
| **Bulk Processing** | Layers | "1000+ profiles per hour. Background queue." |
| **API Access** | Code | "Integrate with your stack. REST endpoints." |

### How It Works (3 steps)
| Step | Title | Description |
|------|-------|-------------|
| 01 | Upload | "Import CSV with names, companies, or roles." |
| 02 | Scrape | "Find LinkedIn profiles automatically." |
| 03 | Enrich | "Get emails and phone numbers. Export." |

### CTA Section
```
Headline: "Join the waitlist"
Button: "Join Waitlist" (with arrow icon)
```

### Footer
```
Links: Sign In | Waitlist | Privacy | Terms
Copyright: "© Enrich Engine 2026"
```

### Waitlist Page

**Pre-submission:**
```
Headline: "Request Access"
Description: "Enrich Engine is currently invite-only. Join the waitlist and we'll reach out when we're ready for you."
Input Placeholder: "you@company.com"
Button: "Join Waitlist"
Footer: "We'll never share your email. Unsubscribe anytime."
```

**Post-submission:**
```
Headline: "You're on the list"
Message: "We'll be in touch at {email}"
Button: "Back to Home"
```

---

## Marketing Page Structure

### Landing Page Layout
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  NAVIGATION                                                                 │
│  [Logo]                                           [Sign in]  [Waitlist]    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                              HERO SECTION                                   │
│                                                                             │
│                                Scrape                                       │
│                                                                             │
│        Find LinkedIn profiles. Enrich with emails & phones.                │
│                        Build lead lists.                                    │
│                                                                             │
│                         [Join Waitlist →]                                   │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                             STATS SECTION                                   │
│                                                                             │
│     95%              10x              1000+             $29                 │
│  Email accuracy     Faster       Profiles/hour      Per month              │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                           FEATURES SECTION                                  │
│                                                                             │
│  ┌─────────────────────────┐  ┌────────────┐  ┌────────────┐              │
│  │   LinkedIn Scraper      │  │   Email    │  │   Phone    │              │
│  │   Upload names or       │  │   Finder   │  │   Finder   │              │
│  │   companies. Get        │  │   95%      │  │   Direct   │              │
│  │   LinkedIn URLs.        │  │   accuracy │  │   dials    │              │
│  └─────────────────────────┘  └────────────┘  └────────────┘              │
│                                                                             │
│  ┌────────────┐  ┌────────────────────────────────────────────────────┐   │
│  │    CSV     │  │                  Bulk Processing                    │   │
│  │   Export   │  │          1000+ profiles per hour. Background.      │   │
│  │            │  │                                                     │   │
│  └────────────┘  └────────────────────────────────────────────────────┘   │
│                                                                             │
│                  ┌────────────────────────────────────────┐                │
│                  │              API Access                 │                │
│                  │    Integrate with your stack. REST.    │                │
│                  └────────────────────────────────────────┘                │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                         HOW IT WORKS SECTION                                │
│                                                                             │
│           01                    02                    03                    │
│         Upload                Scrape                Enrich                 │
│                                                                             │
│     Import CSV with       Find LinkedIn        Get emails and              │
│     names, companies,     profiles             phone numbers.              │
│     or roles.             automatically.       Export.                     │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                             CTA SECTION                                     │
│                                                                             │
│                       Join the waitlist                                     │
│                                                                             │
│                        [Join Waitlist →]                                    │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  FOOTER                                                                     │
│  [Logo]            Sign In | Waitlist | Privacy | Terms                    │
│                                           © Enrich Engine 2026             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## App Dashboard

### Navigation (Sidebar)

**Order:**
1. Scrape - Primary action tab
2. Lists - File management
3. Enrich - Enrichment workflow
4. Settings - Configuration

**Sidebar Layout:**
```
┌────────────────────┐
│  [Logo]            │
│  Enrich Engine     │
├────────────────────┤
│                    │
│  🔍 Scrape         │ ← Active state
│  📁 Lists          │
│  ✨ Enrich         │
│                    │
├────────────────────┤
│                    │
│  ⚙️ Settings       │
│                    │
├────────────────────┤
│  [User Avatar]     │
│  John Smith        │
│  john@company.com  │
└────────────────────┘
```

### Page Header Pattern
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Page Title                                                                 │
│  Description text explaining what this page does                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Dashboard Layout
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ┌──────────────┐ ┌────────────────────────────────────────────────────────┐│
│ │              │ │                                                        ││
│ │   SIDEBAR    │ │                      MAIN CONTENT                      ││
│ │              │ │                                                        ││
│ │  Scrape      │ │  ┌──────────────────────────────────────────────────┐ ││
│ │  Lists       │ │  │                                                  │ ││
│ │  Enrich      │ │  │              Page Content Here                   │ ││
│ │              │ │  │                                                  │ ││
│ │  Settings    │ │  │                                                  │ ││
│ │              │ │  └──────────────────────────────────────────────────┘ ││
│ │              │ │                                                        ││
│ └──────────────┘ └────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Styling

### Buttons

**Primary (Black)**
```css
.btn-primary {
  background: var(--primary);
  color: var(--primary-foreground);
  border-radius: 0.375rem;
  padding: 0.5rem 1rem;
  font-weight: 500;
  transition: opacity 0.15s;
}
.btn-primary:hover {
  opacity: 0.9;
}
```

**Secondary (Outline)**
```css
.btn-secondary {
  background: transparent;
  color: var(--foreground);
  border: 1px solid var(--border);
  border-radius: 0.375rem;
  padding: 0.5rem 1rem;
  font-weight: 500;
}
.btn-secondary:hover {
  background: var(--background-muted);
}
```

### Inputs
```css
.input {
  background: var(--background);
  border: 1px solid var(--border);
  border-radius: 0.375rem;
  padding: 0.5rem 0.75rem;
  font-size: var(--text-sm);
}
.input:focus {
  border-color: var(--foreground);
  outline: none;
  box-shadow: 0 0 0 2px var(--background), 0 0 0 4px var(--border);
}
```

### Cards
```css
.card {
  background: var(--background);
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  box-shadow: var(--shadow-sm);
}
```

### Tables
```css
.table {
  width: 100%;
  border-collapse: collapse;
}
.table th {
  text-align: left;
  font-weight: 500;
  font-size: var(--text-sm);
  color: var(--foreground-muted);
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border);
}
.table td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border);
}
.table tr:hover {
  background: var(--background-muted);
}
```

### Status Badges
```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-size: var(--text-xs);
  font-weight: 500;
}
.badge-success {
  background: #dcfce7;
  color: #166534;
}
.badge-warning {
  background: #fef3c7;
  color: #92400e;
}
.badge-error {
  background: #fee2e2;
  color: #991b1b;
}
.badge-default {
  background: var(--background-muted);
  color: var(--foreground-muted);
}
```

---

## Animations

### Scroll Reveal
```css
.reveal {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}
.reveal.visible {
  opacity: 1;
  transform: translateY(0);
}
```

### Counter Animation
```javascript
// Animate numbers counting up on scroll
function animateCounter(element, target, duration = 2000) {
  let start = 0;
  const increment = target / (duration / 16);

  const timer = setInterval(() => {
    start += increment;
    if (start >= target) {
      element.textContent = target;
      clearInterval(timer);
    } else {
      element.textContent = Math.floor(start);
    }
  }, 16);
}
```

### Progress Bar
```css
.progress-bar {
  height: 4px;
  background: var(--border);
  border-radius: 2px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: var(--foreground);
  transition: width 0.3s ease;
}
```

---

## Responsive Breakpoints

```css
/* Mobile first */
@media (min-width: 640px) {  /* sm */
  /* Small tablets */
}
@media (min-width: 768px) {  /* md */
  /* Tablets */
}
@media (min-width: 1024px) { /* lg */
  /* Laptops */
}
@media (min-width: 1280px) { /* xl */
  /* Desktops */
}
@media (min-width: 1536px) { /* 2xl */
  /* Large desktops */
}
```

---

## Implementation Order

1. Set up Tailwind config with custom theme
2. Update globals.css with CSS variables
3. Landing page structure (copy from GTM Dialer)
4. Marketing components (Hero, Stats, Features, HowItWorks, CTA, Footer)
5. Waitlist page
6. Dashboard layout with sidebar
7. Sidebar navigation component
8. Page header component
9. Update Shadcn components for light theme

---

## Testing Checklist

### Marketing Site
- [ ] Landing page renders correctly
- [ ] Hero headline "Scrape" displays prominently
- [ ] Stats animate on scroll
- [ ] Features bento grid is responsive
- [ ] How it works steps display correctly
- [ ] CTA section with waitlist button works
- [ ] Footer links work
- [ ] Waitlist form submits correctly
- [ ] Success message shows after submission

### App Dashboard
- [ ] Sidebar shows correct navigation order
- [ ] Active state highlights current page
- [ ] Page layouts are consistent
- [ ] Light mode theme applied correctly
- [ ] Responsive on mobile/tablet/desktop

### Components
- [ ] Buttons have correct styling
- [ ] Inputs focus states work
- [ ] Cards have subtle shadows
- [ ] Tables are readable
- [ ] Status badges use correct colors
- [ ] Progress bars animate smoothly
