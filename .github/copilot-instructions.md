# Copilot Instructions for Portfolio Project

## Project Overview
This is a static portfolio website built with HTML, CSS, and Vanilla JavaScript. It features a "Cyber Mode" theme toggle that drastically changes the visual aesthetic using CSS variables and canvas effects.

## Architecture & Structure
- **Entry Point**: `index.html` is a lightweight **hub** page — it does not use the Cyber Mode theme. It just links out to the site's sections: `portfolio.html` (Game Dev & 3D Art) and `webapps.html` (standalone web apps/tools). Keep it minimal; don't add portfolio content here.
- **Game Dev Portfolio**: `portfolio.html` contains the main hero/skills/projects/B2B/contact structure (this used to be `index.html`). `services.html` and `resume.html` are sub-pages of this section and share its sidebar nav via `js/loader.js`.
- **Web Apps**: `webapps.html` lists standalone tools (e.g. `dienstplan.html`). Each app is a fully self-contained HTML file with its own inline `<style>`/`<script>` and its own visual identity — it does not use the portfolio's Cyber Mode styling. Add new apps as a new self-contained `.html` file plus a card in `webapps.html`.
- **Styling**:
  - `css/hub.css`: Shared neutral styles for `index.html` and `webapps.html` only. Do not mix with the Cyber Mode files below.
  - `css/base.css`: Core variables, reset, typography, and layout for the Cyber Mode portfolio (`portfolio.html`, `services.html`, `resume.html`).
  - `css/components.css`: Reusable UI elements (cards, buttons) for the Cyber Mode portfolio.
  - `css/cyberpunk.css`: Specific overrides and effects for the "Cyber Mode" theme.
- **Logic**:
  - `js/loader.js`: Renders the shared sidebar nav (with active-link highlighting) on `portfolio.html`, `services.html`, and `resume.html`. Not used on `index.html`/`webapps.html`.
  - `js/script.js`: Main application logic, event listeners, and the `projects` data object (used on `portfolio.html`).
  - `js/socials.js`: Defines the shared `socialLinks` config; `initSocials()` auto-populates a `.social-links` container (Cyber Mode sidebar). `index.html`/`webapps.html` render the same `socialLinks` data into their own `.hub-social` footer markup instead.
- **Assets**: Images are stored in `images/portfolio/` and referenced directly in JS data or HTML.

## Development Conventions

### Styling & Theming
- **CSS Variables**: Always use CSS variables for colors and fonts to ensure theme compatibility.
  - Example: Use `var(--bg-color)` instead of hardcoded hex values.
- **Cyber Mode**:
  - The theme is activated by adding the `.cyber-mode` class to the `<body>`.
  - Place all "Cyber Mode" specific styles (neon glows, font changes, canvas visibility) in `css/cyberpunk.css`.
  - Use `font-family: 'Space Mono', monospace;` for cyber-themed text elements.

### JavaScript & Data
- **Project Data**: New portfolio items should be added to the `projects` constant in `js/script.js`.
  - Format: Key-value pair with `title`, `desc`, and HTML `content`.
- **DOM Manipulation**: Use vanilla JS. Avoid adding libraries like jQuery.
- **Global Functions**: Functions triggered by HTML attributes (like `onclick="toggleCyberMode()"`) must be accessible in the global scope.

### Images
- Store portfolio images in `images/portfolio/`.
- Ensure paths in `js/script.js` are relative to the root (e.g., `images/portfolio/image.png`).

## Common Workflows
- **Adding a Project**:
  1. Add the image to `images/portfolio/`.
  2. Add a new entry to the `projects` object in `js/script.js`.
  3. Ensure the key matches the ID used in any HTML triggers if applicable.
- **Modifying Themes**:
  - Update `css/base.css` for the default "Clean" look.
  - Update `css/cyberpunk.css` for the "Void/Cyber" look.

## External Dependencies
- **Fonts**: Google Fonts (Space Mono) loaded in `portfolio.html`/`services.html`/`resume.html`; the hub pages (`index.html`, `webapps.html`) also load Inter for their neutral look.
- **Icons**: Font Awesome loaded via CDN on every page that needs icons.
