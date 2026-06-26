## Brand & Style

The design system is engineered to project a persona of unwavering reliability, speed, and transparency—essential traits for a modern broadband provider. The target audience ranges from tech-savvy remote workers to families requiring simple, dependable home connectivity.

The visual style is **Corporate Modern with a Minimalist execution**. It prioritizes clarity and whitespace to reduce cognitive load during complex tasks like plan selection or billing. By utilizing a high-contrast palette against pure white surfaces, the UI evokes a sense of efficiency and professional hygiene, ensuring users feel their digital infrastructure is in capable hands.

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