// ==============================================
// THEME CONFIG - Single source of truth
// Edit this file to change your app's layout and theme
// ==============================================

export type LayoutType = "sidebar" | "topnavWithSidebar" | "sidebarWithTopbar" | "app";

export const themeConfig = {
  // Layout: "sidebar" | "topnavWithSidebar" | "sidebarWithTopbar" | "app"
  layout: "app" as LayoutType,

  // Theme colors (hex values) - Light mode
  colors: {
    // Core
    primary: "#111827",           // Black buttons
    primaryForeground: "#ffffff", // White text on primary
    secondary: "#f9fafb",
    secondaryForeground: "#111827",
    background: "#ffffff",        // Pure white
    foreground: "#111827",        // Primary text - near black
    card: "#ffffff",
    cardForeground: "#111827",
    muted: "#f9fafb",             // Slight grey for sections
    mutedForeground: "#6b7280",   // Secondary text
    accent: "#3b82f6",            // Blue for links, active states
    accentForeground: "#ffffff",
    destructive: "#ef4444",       // Red
    destructiveForeground: "#ffffff",
    border: "#e5e7eb",            // Default borders
    input: "#e5e7eb",
    ring: "#111827",
    // Charts
    chart1: "#111827",
    chart2: "#374151",
    chart3: "#6b7280",
    chart4: "#9ca3af",
    chart5: "#d1d5db",
    // Sidebar
    sidebar: "#ffffff",
    sidebarForeground: "#111827",
    sidebarPrimary: "#111827",
    sidebarPrimaryForeground: "#ffffff",
    sidebarAccent: "#f3f4f6",
    sidebarAccentForeground: "#111827",
    sidebarBorder: "#e5e7eb",
  },

  // Border radius (in pixels)
  radius: {
    sm: 6,
    md: 6,
    lg: 8,
    xl: 12,
  },

  // Typography
  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontMono: "'JetBrains Mono', 'Fira Code', monospace",
  },
};

// Helper to generate CSS variables from config
export function generateCSSVariables(config: typeof themeConfig) {
  return {
    // Colors
    "--color-background": config.colors.background,
    "--color-foreground": config.colors.foreground,
    "--color-card": config.colors.card,
    "--color-card-foreground": config.colors.cardForeground,
    "--color-popover": config.colors.card,
    "--color-popover-foreground": config.colors.cardForeground,
    "--color-primary": config.colors.primary,
    "--color-primary-foreground": config.colors.primaryForeground,
    "--color-secondary": config.colors.secondary,
    "--color-secondary-foreground": config.colors.secondaryForeground,
    "--color-muted": config.colors.muted,
    "--color-muted-foreground": config.colors.mutedForeground,
    "--color-accent": config.colors.accent,
    "--color-accent-foreground": config.colors.accentForeground,
    "--color-destructive": config.colors.destructive,
    "--color-destructive-foreground": config.colors.destructiveForeground,
    "--color-border": config.colors.border,
    "--color-input": config.colors.input,
    "--color-ring": config.colors.ring,
    "--color-chart-1": config.colors.chart1,
    "--color-chart-2": config.colors.chart2,
    "--color-chart-3": config.colors.chart3,
    "--color-chart-4": config.colors.chart4,
    "--color-chart-5": config.colors.chart5,
    "--color-sidebar": config.colors.sidebar,
    "--color-sidebar-foreground": config.colors.sidebarForeground,
    "--color-sidebar-primary": config.colors.sidebarPrimary,
    "--color-sidebar-primary-foreground": config.colors.sidebarPrimaryForeground,
    "--color-sidebar-accent": config.colors.sidebarAccent,
    "--color-sidebar-accent-foreground": config.colors.sidebarAccentForeground,
    "--color-sidebar-border": config.colors.sidebarBorder,
    "--color-sidebar-ring": config.colors.ring,
    // Radius
    "--radius-sm": `${config.radius.sm / 16}rem`,
    "--radius-md": `${config.radius.md / 16}rem`,
    "--radius-lg": `${config.radius.lg / 16}rem`,
    "--radius-xl": `${config.radius.xl / 16}rem`,
    // Typography
    "--font-sans": config.typography.fontFamily,
    "--font-mono": config.typography.fontMono,
  } as React.CSSProperties;
}
