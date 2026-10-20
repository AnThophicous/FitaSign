# FitaSign

Desktop UI design tool for Roblox developers. Electron and TypeScript. Windows and Linux. UI in Brazilian Portuguese; Roblox property/class names remain canonical.

## Surfaces

Home: a 60px charcoal navigation rail; dark main surface; restrained FitaSign wordmark; title Projetos; search; upper-right Novo projeto. Project cards carry honest previews and names. The first launch has a short empty state and a ready-to-open example, not invented recent projects. No marketing sections or explanatory paragraphs.

Editor: dark dotted canvas; slim 56px header; narrow dark layer tree and 264px dark property inspector; compact floating tool strip. ScreenGui bounds are visible. A concrete Roblox screen is the focus. Header has back, project title, undo/redo, preview and Exportar. Properties appear only for the selection. No assistant or chat, AI badge, credits, publish, collaboration, cloud account, or onboarding checklist.

## Tokens

Font: system humanist sans, Segoe UI on Windows, system-ui on Linux. 13px controls, 12px metadata, 28px home title. Regular/medium weights. No web-font downloads. Spacing: 4, 8, 12, 16, 24, 32, 48. Radii: 6px controls, 10px cards, 12px popovers. Rail #151515; canvas #141414; dots #424242; main #191919; panels #1c1c1c; text #d6d6d6; muted #858585; borders #303030. Selection, focus and primary actions use neutral grays up to #dedede. No chromatic accent. This all-dark monochrome direction is the user's approved correction after the initial draft. User-created Roblox projects can use their own palette; the shipped example is grayscale. Avoid gradients in the application chrome, glass, neon, large shadows, decorative metrics, all-caps microheadings, emojis and illustrations. Shadows only for floating surfaces.

## Interaction

Rounded Phosphor icons, filled for navigation, regular for tools. Label actions with a verb where needed. Tooltips and accessible names for icon-only controls. Natural grouping, clear hover/pressed/selected state. Undo after edits, keyboard shortcuts, predictable selection. At most 140ms ease-out transitions; respect reduced motion. No fake loading or success toast for every click.

## Reference boundary

Attached screenshots inform visual treatment only. Do not adopt their product features or logos. FitaSign AI runs in external agents through MCP + skills + AGENTS.md. The application has no built-in assistant. Projects, tree manipulation, Roblox properties, preview and export are the product.
