# OmniDial Frontend Design Specification

## Overview

A premium, editorial-brutalist dark interface for a sales dialer. No gradients, no fluff. Monochromatic with bold typography, immersive animations, and a product-first approach.

---

## 1. Aesthetic Direction

### Core Principles
- **No gradients** - Flat colors only, clean and professional
- **Monochromatic** - Shades of black and gray exclusively
- **Bold rough edges** - Mix of sharp (0px) and medium rounded (8-12px) corners
- **Editorial quality** - Magazine-style typography and layouts
- **Immersive motion** - Rich scroll-triggered animations, parallax, reveals
- **Product-focused** - Let the dialer sell itself

### Visual Style Keywords
- Brutalist-Editorial hybrid
- Dark, textured, bold
- Typography as art
- Professional with edge

---

## 2. Color Palette

### Primary Colors
```css
--background:       #0a0a0a;   /* Near black base */
--background-elevated: #111111; /* Cards, modals */
--foreground:       #fafafa;   /* Primary text */
--foreground-muted: #737373;   /* Secondary text */
--border:           #262626;   /* Subtle borders */
--border-focus:     #404040;   /* Focus state borders */
```

### State Colors (Minimal)
```css
--error:            #ef4444;   /* Red for errors only */
--error-muted:      #7f1d1d;   /* Error backgrounds */
```

### No Accent Colors
- All interactive elements use foreground/white
- Hover states use opacity/brightness shifts
- Active states use border emphasis

---

## 3. Typography

### Font Stack
```css
/* Headlines - Landing page only */
--font-display: 'Instrument Serif', Georgia, serif;

/* Body - Everywhere */
--font-sans: 'Geist', system-ui, sans-serif;

/* Code/Data */
--font-mono: 'Geist Mono', monospace;
```

### Scale
```css
--text-xs:   0.75rem;   /* 12px */
--text-sm:   0.875rem;  /* 14px */
--text-base: 1rem;      /* 16px */
--text-lg:   1.125rem;  /* 18px */
--text-xl:   1.25rem;   /* 20px */
--text-2xl:  1.5rem;    /* 24px */
--text-3xl:  1.875rem;  /* 30px */
--text-4xl:  2.25rem;   /* 36px */
--text-5xl:  3rem;      /* 48px */
--text-6xl:  3.75rem;   /* 60px */
--text-7xl:  4.5rem;    /* 72px */
--text-8xl:  6rem;      /* 96px */
```

### Usage
| Element | Font | Weight | Size |
|---------|------|--------|------|
| Landing H1 | Instrument Serif | 400 | 6xl-8xl |
| Landing H2 | Instrument Serif | 400 | 4xl-5xl |
| App H1 | Geist | 700 | 2xl |
| App H2 | Geist | 600 | xl |
| Body | Geist | 400 | base |
| Small/Labels | Geist | 500 | sm |
| Mono/Data | Geist Mono | 400 | sm |

---

## 4. Spacing

### Scale (Variable approach)
```css
/* Tight - Data-heavy areas */
--space-1: 0.25rem;  /* 4px */
--space-2: 0.5rem;   /* 8px */
--space-3: 0.75rem;  /* 12px */
--space-4: 1rem;     /* 16px */

/* Generous - Marketing/Hero areas */
--space-6: 1.5rem;   /* 24px */
--space-8: 2rem;     /* 32px */
--space-12: 3rem;    /* 48px */
--space-16: 4rem;    /* 64px */
--space-24: 6rem;    /* 96px */
--space-32: 8rem;    /* 128px */
```

### Application
- **App UI**: Tight spacing (4-16px)
- **Landing page**: Generous spacing (24-128px)
- **Section padding**: 96px vertical on landing
- **Component padding**: 16-24px

---

## 5. Border Radius

### Values
```css
--radius-none: 0px;      /* Sharp corners - buttons, some cards */
--radius-sm:   4px;      /* Subtle rounding */
--radius-md:   8px;      /* Default rounded - inputs, cards */
--radius-lg:   12px;     /* Larger elements */
--radius-full: 9999px;   /* Pills, avatars */
```

### Usage
| Element | Radius |
|---------|--------|
| Primary buttons | 0px (sharp) |
| Secondary buttons | 8px |
| Input fields | 8px |
| Cards | 12px |
| Modals | 12px |
| Tags/Badges | 4px |
| Avatars | full |

---

## 6. Borders & Shadows

### Borders
```css
--border-width: 1px;     /* Hairline, consistent */
--border-color: #262626; /* Default */
--border-focus: #404040; /* Focus state */
```

### Shadows
**None.** Flat design using borders for separation.

---

## 7. Icons

### Style
- **Custom minimal** - Stripped to essential shapes
- Replace Lucide with simplified custom icons where possible
- 1.5px stroke weight
- 20px default size, 16px small, 24px large

### Priority Icons to Customize
- Phone (dialer)
- User (leads)
- Chart (analytics)
- Settings (gear)
- Navigation arrows
- Call controls (mute, end, hold)

---

## 8. Animation & Motion

### Library
**GSAP** (already installed) with ScrollTrigger

### Timing
```css
--duration-fast:   150ms;  /* Micro-interactions */
--duration-normal: 200ms;  /* Hovers, focus */
--duration-slow:   400ms;  /* Page elements */
--duration-slower: 600ms;  /* Hero animations */

--ease-out: cubic-bezier(0.16, 1, 0.3, 1);
--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
```

### Scroll Effects (All implemented)
1. **Parallax layers** - Background elements move at different speeds
2. **Reveal animations** - Elements fade/slide in on viewport entry
3. **Sticky sections** - Sections pin while content animates

### Page Transitions
- **Slide/Push** - Pages slide in from direction
- Duration: 400ms
- Easing: ease-out

### Hover States
- **Scale + subtle shadow simulation** (border emphasis)
- Scale: 1.02 on cards/buttons
- Transition: 150ms

---

## 9. Decorative Elements

### Grain Texture
```css
.grain::before {
  content: "";
  position: fixed;
  inset: 0;
  background-image: url("data:image/svg+xml,..."); /* noise SVG */
  opacity: 0.03;
  pointer-events: none;
  z-index: 1000;
}
```

### Geometric Shapes
- Subtle lines and circles as background decoration
- Very low opacity (5-10%)
- Static, not animated

### Typography as Art
- Large background text: "CALL" "CLOSE" "DIAL"
- Opacity: 3-5%
- Font: Instrument Serif
- Size: 20-40vw
- Position: Behind content, clipped

---

## 10. Copy & Voice

### Tone
**Direct & Confident** - No fluff, assertive, commands

### Headlines
**Short & Punchy** - One word where possible

| Page | Headline |
|------|----------|
| Dashboard | "Home." |
| Dialer | "Dialer." |
| Leads | "Leads." |
| Analytics | "Analytics." |
| Settings | "Settings." |

### CTAs
**Action verbs** - Single word, direct

| Action | Button Text |
|--------|-------------|
| Make call | "Call" |
| Start dialing session | "Start" |
| Save changes | "Save" |
| Import leads | "Import" |
| Create | "Create" |

### Empty States
**Minimal & Factual**

| State | Message |
|-------|---------|
| No leads | "No leads." |
| No calls | "No calls." |
| No results | "Nothing found." |

### Error Messages
**Factual, brief**

| Error | Message |
|-------|---------|
| Required field | "Required." |
| Invalid email | "Invalid email." |
| API error | "Failed. Try again." |

---

## 11. Form Fields

### Input Style
- **Floating labels** - Labels animate from inside to above on focus
- **No placeholders** - Clean empty state
- Border: 1px solid #262626
- Border radius: 8px
- Height: 48px
- Background: transparent (or very subtle #111)

### States
```css
/* Default */
border-color: #262626;

/* Focus */
border-color: #404040;
outline: none;

/* Error */
border-color: #ef4444;

/* Disabled */
opacity: 0.5;
cursor: not-allowed;
```

### Validation
- **Icon indicator** - Checkmark (success) or X (error) in field
- No text messages below field
- Icon appears on blur after input

### Buttons
```css
/* Primary */
background: #fafafa;
color: #0a0a0a;
border: none;
border-radius: 0px; /* Sharp */
padding: 12px 24px;
font-weight: 600;

/* Secondary */
background: transparent;
color: #fafafa;
border: 1px solid #262626;
border-radius: 8px;

/* Disabled/Loading */
opacity: 0.5;
```

---

## 12. Landing Page

### Hero Section
- **Product screenshot** - Actual dialer UI prominently displayed
- Large serif headline above
- Single CTA button
- Three.js interactive 3D element (floating phone/screen)

### Features
- **Bento grid** - Asymmetric card layout
- Mixed card sizes (1x1, 2x1, 1x2)
- Screenshot/illustration in each card
- Minimal text

### Social Proof
**None** - Product speaks for itself

### Pricing
**Hidden** - "Start free" CTA only, no public pricing

### Background Elements
- Grain texture overlay
- Large background text: "CALL" "CLOSE" "DIAL"
- Subtle geometric lines

---

## 13. Dashboard/App

### Sidebar
- **Minimal text** - Icons + short labels
- Width: 200px expanded, 64px collapsed
- Background: same as page (#0a0a0a)
- Border-right: 1px solid #262626

### Navigation Items
```css
/* Default */
color: #737373;
padding: 8px 12px;
border-radius: 8px;

/* Hover */
background: #111111;
color: #fafafa;

/* Active */
background: #fafafa;
color: #0a0a0a;
```

### Tables
- **Minimal rows** - No visible borders between rows
- Row hover: subtle background (#111111)
- Header: uppercase, small, muted color
- Alternating backgrounds: none

### Dashboard Home
- **Quick stats** - Today's metrics prominently
- Large numbers, minimal labels
- Call count, connects, talk time

### Notifications
- **Top center banner** - Full width, one at a time
- Auto-dismiss: 4 seconds
- No stacking

---

## 14. Dialer Interface

### Active Call Screen
- **Controls focus** - Large call control buttons primary
- Timer secondary, but visible
- Lead info in tabbed panel

### Call Controls
- **Floating bar** - Fixed bottom, always visible
- Height: 80px
- Background: #111111
- Border-top: 1px solid #262626

### Control Buttons
```css
/* End Call */
background: #ef4444;
color: white;
width: 64px;
height: 64px;
border-radius: 50%;

/* Mute/Hold */
background: #262626;
color: #fafafa;
width: 48px;
height: 48px;
border-radius: 50%;
```

### Lead Context
- **Tabbed panels** - Info / Notes / History / Tasks
- Tab bar at top of panel
- Scrollable content within

### Post-Call Disposition
- **Modal overlay** - Must complete before continuing
- List of disposition buttons
- Quick select with keyboard shortcuts (1-9)

---

## 15. Loading States

### Skeleton Screens
- Gray placeholder shapes where content will be
- Background: #1a1a1a
- No animation (static)
- Match exact layout of loaded content

### Page Loading
- Skeleton of page structure
- No spinners
- No progress bars

---

## 16. Responsive Design

### Breakpoints
```css
--screen-sm:  640px;
--screen-md:  768px;
--screen-lg:  1024px;
--screen-xl:  1280px;
--screen-2xl: 1536px;
```

### Approach
**Fully responsive** - Equal attention to all sizes

### Mobile Adaptations
- Sidebar becomes bottom tab bar
- Cards stack vertically
- Tables become card lists
- Floating call bar remains at bottom

---

## 17. Libraries

### Currently Installed
- **GSAP** - Animation, ScrollTrigger
- **Geist** - Font family

### To Add
- **Three.js** - Interactive 3D hero element
- **Instrument Serif** - Display font (Google Fonts)

### Bundle Consideration
- Keep Three.js code-split, only loaded on landing page
- Total additional JS: ~150kb gzipped

---

## 18. Component Checklist

### Landing Page
- [ ] Grain texture overlay
- [ ] Large background text ("CALL" "CLOSE" "DIAL")
- [ ] Three.js interactive hero element
- [ ] Product screenshot hero
- [ ] Bento grid features
- [ ] Scroll-triggered reveals
- [ ] Parallax background elements
- [ ] Sticky sections
- [ ] Serif headlines (Instrument Serif)

### App Interface
- [ ] Floating label inputs
- [ ] Icon validation indicators
- [ ] Skeleton loading states
- [ ] Top center toast notifications
- [ ] Minimal row tables
- [ ] Quick stats dashboard home
- [ ] Compact sidebar navigation

### Dialer
- [ ] Floating bottom control bar
- [ ] Large control buttons
- [ ] Tabbed lead context panel
- [ ] Modal disposition flow
- [ ] Timer display

---

## 19. File Changes Required

### New Files
- `frontend/components/ui/floating-input.tsx`
- `frontend/components/landing/three-hero.tsx`
- `frontend/components/landing/bento-grid.tsx`
- `frontend/components/ui/skeleton.tsx`
- `frontend/components/ui/toast-banner.tsx`

### Modified Files
- `frontend/theme.config.ts` - New color palette
- `frontend/app/globals.css` - Typography, grain, animations
- `frontend/app/page.tsx` - Complete landing redesign
- `frontend/app/layout.tsx` - Add Instrument Serif font
- `frontend/components/dashboard/Sidebar.tsx` - Minimal text style
- `frontend/app/dashboard/dialer/page.tsx` - Floating controls, tabs
- `frontend/components/ui/button.tsx` - Sharp corners variant
- `frontend/components/ui/Card.tsx` - Updated styling

---

## 20. Implementation Order

1. **Theme & Base Styles**
   - Update color palette
   - Add Instrument Serif font
   - Implement grain texture
   - Update spacing scale

2. **Core Components**
   - Floating label inputs
   - Updated buttons (sharp variant)
   - Skeleton components
   - Toast banner

3. **Landing Page**
   - Typography as art backgrounds
   - Three.js hero element
   - Bento grid features
   - Scroll animations

4. **App Interface**
   - Sidebar refinement
   - Table styling
   - Dashboard home quick stats
   - Navigation updates

5. **Dialer**
   - Floating control bar
   - Tabbed panels
   - Modal disposition
   - Call screen layout

---

*Specification Version: 1.0*
*Last Updated: January 2026*
