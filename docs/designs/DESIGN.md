---
name: Dev Inbox Design System
colors:
  # Core brand palette
  primary: '#2C5AA0'
  secondary: '#0EA5E9'
  tertiary: '#894C00'
  neutral: '#76777D'

  # Light mode surfaces  (main bg = #e2e2e8)
  background-light: '#e2e2e8'
  surface-light: '#f9f9ff'
  surface-container-light: '#ffffff'

  # Dark mode surfaces
  background-dark: '#1a1c20'
  surface-dark: '#2f3035'
  surface-container-dark: '#3a3c42'

  # Text
  on-primary: '#ffffff'
  on-secondary: '#ffffff'
  on-tertiary: '#ffffff'

  # Semantic
  error: '#ba1a1a'
  status-success: '#10b981'
  status-warning: '#f59e0b'

  # Source identifiers
  github-neutral: '#24292f'
  azure-blue: '#0078d4'
  note-yellow: '#fefce8'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  headline-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  header-height: 56px
  sidebar-width: 240px
  detail-width-min: 360px
  detail-width-max: 420px
  gutter: 16px
  row-padding-comfy: 12px 16px
  row-padding-compact: 6px 16px
---

## Brand & Style

This design system is built for the high-context world of software engineering. The brand personality is **utilitarian, precise, and systematic**, focusing on reducing cognitive load for developers managing multiple streams of information.

The visual style is **Corporate / Modern**, leaning heavily into a "technical dashboard" aesthetic. It prioritizes information density and clear architectural boundaries over decorative elements. The goal is to create a "tool-like" experience that feels like a native extension of a developer's IDE or terminal environment—reliable, fast, and unobtrusive.

## Colors

The palette is anchored by **Cool Blue (#2c5aa0)**, providing a stable, professional foundation. A brighter **Teal/Sky Blue (#0ea5e9)** serves as the secondary accent for interactive states and highlights.

Neutral tones are strictly managed to define the "three-zone" layout:
- **Surface Base:** Pure white for the primary content areas (List and Detail).
- **Surface Muted:** A very subtle gray (`#f8fafc`) for the Sidebar to provide structural contrast.
- **Dividers:** Lean, high-precision lines (`#e2e8f0`) to separate the density-aware modules.

Semantic colors for GitHub, Azure DevOps, and internal "Notes" are used sparingly as identifiers to ensure the unified inbox remains visually cohesive without becoming chaotic.

## Typography

The typography system uses **Inter** for all UI elements to ensure maximum legibility at small sizes. The scale follows a modified Material Design rhythm, optimized for desktop information density.

- **Monospace Integration:** Use a secondary monospace font (e.g., JetBrains Mono) for ticket IDs, branch names, and code snippets to immediately signal "technical data" to the user.
- **Hierarchy through Weight:** Distinction between read and unread states is primarily handled through font weight (Semi-bold for unread titles, Regular for read).
- **Metadata:** Use `body-sm` and `label-md` for timestamps, repository names, and secondary tags to keep the primary vertical rhythm focused on the task title.

## Layout & Spacing

This design system utilizes a **Fixed-Shell Fluid-Content** grid. The application shell consists of a fixed top header and a fixed-width left sidebar. The remaining viewport is divided between the Inbox List and the Detail Panel.

- **The Detail Panel:** Opens inline, pushing the list width rather than overlaying it. This maintains the user's context and allows for quick "j/k" keyboard navigation through the inbox.
- **Density System:** The spacing tokens provide two modes. "Comfy" is the default for standard browsing, while "Compact" reduces vertical padding by 50% for power users managing high-volume notifications.
- **Breakpoints:** On screens smaller than 1280px, the Detail Panel transitions from a side-by-side view to a full-screen overlay to maintain readability.

## Elevation & Depth

This system adopts a **Flat / Minimal depth philosophy**. Visual hierarchy is established through tonal layering and borders rather than heavy shadows.

- **Level 0 (Base):** The main application canvas (`#f1f5f9`).
- **Level 1 (Panels):** Sidebar, List, and Detail areas. These are defined by 1px solid borders (`#e2e8f0`).
- **Level 2 (Active States):** Selected list items use a subtle background tint (`primary-50`) and a high-contrast vertical bar on the left edge.
- **Modals & Command Palette:** Use a soft, diffused shadow (10% opacity) and a backdrop blur to separate the "Command" layer from the "Data" layer.

## Shapes

The shape language is **Soft (0.25rem)**, providing a modern but disciplined look. 

- **Interactive Elements:** Buttons and input fields use the standard 4px (0.25rem) radius.
- **Badges/Tags:** Use a "pill" shape (full rounding) to distinguish status indicators from clickable UI buttons.
- **Cards:** Container elements in the summary dashboard use `rounded-lg` (8px) to feel distinct from the more rigid list rows.

## Components

### Buttons & Controls
- **Primary:** Solid `#2c5aa0` with white text. High-contrast for the "Add Note" or "Merge" actions.
- **Secondary/Ghost:** Transparent backgrounds with 1px borders for less frequent actions like "Snooze" or "Save."

### Density-Aware List
- **Inbox Rows:** Each row must have a fixed height in "Compact" mode. Content truncation is preferred over text wrapping to maintain vertical rhythm.
- **Indicators:** Unread items feature a 2px blue vertical bar on the extreme left.

### Cards & Summary Tiles
- **Dashboard Cards:** Use a Level 1 elevation (border-only) with a centered icon, a large numeric value (`headline-lg`), and a trend indicator (e.g., `+2 today`).

### Input Fields
- **Search (Cmd+K):** A persistent, subtle input in the header. Focus state should highlight the border with the secondary accent color and a 2px outer glow.

### Sidebar Navigation
- **Navigation Items:** Use `body-md` with 500 weight. Active state includes a background tint and the primary color for the icon to guide the eye.