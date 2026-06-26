---
name: Prime Light Broadband
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#434655'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#747686'
  outline-variant: '#c4c5d7'
  surface-tint: '#2151da'
  primary: '#0037b0'
  on-primary: '#ffffff'
  primary-container: '#1d4ed8'
  on-primary-container: '#cad3ff'
  inverse-primary: '#b7c4ff'
  secondary: '#735c00'
  on-secondary: '#ffffff'
  secondary-container: '#fed01b'
  on-secondary-container: '#6f5900'
  tertiary: '#7f2500'
  on-tertiary: '#ffffff'
  tertiary-container: '#a73400'
  on-tertiary-container: '#ffc9b7'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dce1ff'
  primary-fixed-dim: '#b7c4ff'
  on-primary-fixed: '#001551'
  on-primary-fixed-variant: '#0039b5'
  secondary-fixed: '#ffe083'
  secondary-fixed-dim: '#eec200'
  on-secondary-fixed: '#231b00'
  on-secondary-fixed-variant: '#574500'
  tertiary-fixed: '#ffdbcf'
  tertiary-fixed-dim: '#ffb59c'
  on-tertiary-fixed: '#390c00'
  on-tertiary-fixed-variant: '#832700'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 38px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 16px
  md: 24px
  lg: 40px
  xl: 64px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: auto
  max-width: 1280px
---

## Brand & Style

The design system is engineered to project a persona of unwavering reliability, speed, and transparency—essential traits for a modern broadband provider. The target audience ranges from tech-savvy remote workers to families requiring simple, dependable home connectivity.

The visual style is **Corporate Modern with a Minimalist execution**. It prioritizes clarity and whitespace to reduce cognitive load during complex tasks like plan selection or billing. By utilizing a high-contrast palette against pure white surfaces, the UI evokes a sense of efficiency and professional hygiene, ensuring users feel their digital infrastructure is in capable hands.

## Colors

The palette is anchored by **Primary Blue (#1D4ED8)**, a deep, authoritative "Broadband Blue" that signifies stability and high-speed data transmission. This is used for primary actions, navigational anchors, and brand-heavy components.

**Secondary Yellow (#FACC15)** acts as a high-visibility accent. Its use is disciplined—reserved for critical calls-to-action (CTAs) like "Upgrade Now" or "Check Availability" to provide immediate visual contrast without overwhelming the clean aesthetic.

Surfaces follow a strict hierarchy:
- **Base:** Pure White (#FFFFFF) for maximum readability and a crisp, airy feel.
- **Secondary Surfaces:** Soft Slate (#F8FAFC) used to differentiate page sections or group content within cards.
- **Borders:** Thin, hairline Slate (#E2E8F0) to define boundaries without adding visual noise.

## Typography

The typography utilizes **Inter**, a typeface designed for screens, to ensure exceptional legibility at all scales. The system relies on a mathematical scale to create clear information hierarchy.

- **Headlines:** Use Bold and Semi-Bold weights with slight negative letter-spacing to appear compact and impactful.
- **Body Text:** Set in Regular weight with generous line-height to facilitate comfortable reading of service agreements and plan details.
- **Labels:** Use Medium and Semi-Bold weights to provide clear "scannability" for data-heavy views like usage statistics or billing dates. 
- **Accessibility:** Text on white or light gray backgrounds must maintain a minimum contrast ratio of 4.5:1, utilizing the neutral slate tones only for secondary information.

## Layout & Spacing

This design system employs a **Fluid-Fixed Hybrid Grid**. Content is housed within a 12-column grid with a maximum width of 1280px. 

- **Desktop:** 24px gutters with flexible column widths. 
- **Tablet:** 8-column grid with 24px margins.
- **Mobile:** 4-column grid with 16px margins.

The spacing rhythm is built on a **4px base unit**. Component internal padding should favor the "Medium" (24px) unit to maintain the airy, premium feel. Vertical rhythm is established through consistent stack spacing—64px between major page sections and 24px between related content blocks.

## Elevation & Depth

To maintain the "Light" persona, the system avoids heavy, dark shadows. Instead, it utilizes **Tonal Layering and Soft Ambient Depth**:

- **Level 0 (Base):** Pure White (#FFFFFF) background.
- **Level 1 (Sub-surface):** Soft Slate (#F8FAFC) used for inset sections or dashboard backgrounds.
- **Level 2 (Raised):** Cards and floating elements use a subtle, 1px border (#E2E8F0) and an ultra-diffused shadow: `0px 4px 20px rgba(0, 0, 0, 0.03)`.
- **Interactions:** Hover states on interactive cards should transition to a slightly more pronounced shadow to provide tactile feedback without looking "heavy."

## Shapes

The shape language is defined by **pronounced, friendly curves**. 

- **Default Corners:** 16px (1rem) for standard components like buttons and input fields.
- **Large Containers:** 24px (1.5rem) for main cards and pricing tables to emphasize a soft, modern approachable feel.
- **Small Components:** 8px (0.5rem) for tooltips or tags to maintain harmony without sacrificing space.

The use of "Rounded" (Value 2) ensures that even technical information feels accessible and non-intimidating to the end user.

## Components

### Buttons
- **Primary:** Primary Blue background, white text. 16px corner radius.
- **Secondary:** Secondary Yellow background, black text (#0F172A) for maximum accessibility. Used for "Conversion" moments.
- **Ghost:** Transparent background with Primary Blue border and text.

### Inputs & Forms
- Input fields use a 1px border (#E2E8F0) and a 16px corner radius. On focus, the border transitions to Primary Blue with a 2px stroke. Label text is always placed above the field in Label-MD styling.

### Cards
- Standard cards feature a white background, 24px corner radius, and a 1px Slate border. For pricing plans, the "Recommended" plan should feature a 2px Primary Blue border to draw focus.

### Chips & Badges
- Used for "Plan Features" or "Status" (e.g., Active, Pending). These utilize a 50% opacity version of the primary or status color for the background, with full-opacity bold text on top for a modern, glass-like appearance without the blur.

### Lists
- Data lists (usage logs) use 1px bottom borders in Slate (#E2E8F0). Items have a subtle hover state using the Soft Slate (#F8FAFC) background.