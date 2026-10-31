# Dashboard mockup — design specifications
This directory contains a **static visual prototype** for SupportPilot. It documents the intended interface for HW3 and P2; it is not a working application.

## How to preview the mockup
1. From GitHub, open [`dashboard.html`](dashboard.html) and select **Download raw file** (the download icon). Do not use the GitHub code-view page as the preview.
2. Locate the downloaded `dashboard.html` file on your computer.
3. Open the local file in Chrome or another browser (on macOS, use **Command + O** in Chrome and select the file).
4. Confirm that the browser address starts with `file:///` rather than `https://github.com/`.

The mockup shows a sample support investigation using **illustrative synthetic identifiers**. Buttons and text-entry areas are visual placeholders; no authentication, search, agent execution, or database operations are implemented here.

## UI behavior
- Left sidebar: brand, new investigation, history and sign-out affordance.
- Main column: contextual header, user question, assistant response, step badges, evidence cards, text composer.
- Citation card: source title, exact ID, excerpt, and document/record label. Do not invent source IDs.
- Responsive mobile: sidebar moves above/behind navigation; evidence cards stack; no horizontal overflow.
- Keyboard: composer has an accessible label; Enter submits, Shift+Enter adds newline once implemented; all clickable elements must show visible focus.
- Loading: readable progress text; error: recovery action; empty: call to action. The HTML displays a **sample scenario** only, based on synthetic placeholder identifiers rather than verified dataset records.
