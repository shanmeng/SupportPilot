# Dashboard mockup — design specifications
Open `dashboard.html` in a browser. This is a **static interactive-free prototype** for visual intent and screenshots, not application functionality.

## UI behavior
- Left sidebar: brand, new investigation, history and sign-out affordance.
- Main column: contextual header, user question, assistant response, step badges, evidence cards, text composer.
- Citation card: source title, exact ID, excerpt, and document/record label. Do not invent source IDs.
- Responsive mobile: sidebar moves above/behind navigation; evidence cards stack; no horizontal overflow.
- Keyboard: composer has an accessible label; Enter submits, Shift+Enter adds newline once implemented; all clickable elements must show visible focus.
- Loading: readable progress text; error: recovery action; empty: call to action. The HTML displays a **sample scenario** only, based on synthetic placeholder identifiers rather than verified dataset records.
