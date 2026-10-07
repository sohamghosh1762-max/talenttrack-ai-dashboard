# TalentTrack AI Dashboard Recreation

## Goal

Recreate the uploaded TalentTrack AI recruiter dashboard at `/` with the same structure, visual density, colors, sizing, and hierarchy, while adapting cleanly to tablet and mobile screens.

## Build

- Replace the placeholder home page with the complete dashboard: fixed navy sidebar, search/profile header, welcome row, four KPI cards, application chart, skills bars, AI insights, both data tables, hiring pipeline, and quick actions.
- Use the screenshot’s exact labels and mock data, Lucide icons, Recharts, and locally styled React components.
- Add responsive behavior: compact/collapsible navigation, two-column tablet layouts, stacked mobile sections, and scrollable tables without page overflow.
- Add working interactions for search, navigation selection, notifications, profile menu, job creation dialog, row details, match analysis, contextual menus, pipeline filters, quick actions, and View All controls.

## Visual System

- Define the screenshot-matched navy, blue, pastel card, border, shadow, and text tokens in the global design system.
- Match the screenshot’s small-radius cards, compact enterprise typography, spacing, table density, chart styling, and subtle hover transitions.
- Load Inter through the document head and preserve accessible labels, keyboard behavior, focus states, and reduced-motion preferences.

## Validation

- Verify the page at desktop and mobile viewport sizes with browser screenshots.
- Check that menus, dialogs, filtering, navigation states, chart, tables, and sidebar controls render and respond correctly.
- Add unique TalentTrack AI metadata to the home route and remove all template branding.
