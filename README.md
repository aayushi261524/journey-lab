# Journey Lab

A product journey-mapping sandbox adapted for Aayushi’s portfolio from the MIT-licensed [xyflow/vite-react-flow-template](https://github.com/xyflow/vite-react-flow-template). The original copyright and licence are preserved in LICENSE.

## Added in this adaptation

- Onboarding and checkout/recovery journey templates.
- A sidebar for editing step labels and context notes.
- Add/remove steps and connect paths using React Flow’s canvas.
- Explicit browser-local saving and JSON export.
- A deterministic structural review for missing starts/outcomes, unreachable steps, dead ends and decisions with fewer than two outgoing paths.
- Responsive product workspace and visible upstream attribution.

The underlying graph renderer, node dragging, edge connections, minimap and canvas controls are supplied by React Flow. These are not claimed as original functionality.

## Try it

Choose a template; select a step to edit; connect its handles; choose Check journey. Save locally after edits, or export JSON. Templates replace the current canvas only after confirmation. Saved canvases reload in the same browser.

## Boundaries

This is a design sandbox, not a workflow execution engine. Structural checks do not validate usability, production readiness, or business outcomes. There is no AI model, backend, authentication, collaboration service, cloud sync, or real user research. Templates are illustrative.

## Run and deploy

`npm ci` then `npm run dev`. Build: `npm run build` (TypeScript and Vite). Vercel framework: Vite; output directory: dist. No paid API or environment variable is required. Production build and browser verification must pass before release is described as complete.
