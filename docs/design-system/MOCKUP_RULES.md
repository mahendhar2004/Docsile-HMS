# Rules
- Use ONLY the repo's design tokens (web/src/index.css), mirrored in /tokens.css. Never invent colors/themes.
- App background is pure white, set once as `--color-background` in /tokens.css. Every page links tokens.css in <helmet> and uses `var(--color-*)` for background, text, borders, status colors, radius, shadow. Never hardcode a hex that a token carries.
- Eye hospital HMS, desktop, India (₹, +91). Speed first: fewest clicks, keyboard-friendly.
- Build order: 1 Background (done: white) → 2 Components (variants) → screens.
