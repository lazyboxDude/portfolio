# Copilot Instructions for Portfolio Project

## Project Overview
This is a static portfolio website built with HTML, CSS, and Vanilla JavaScript. It features a "Cyber Mode" theme toggle that drastically changes the visual aesthetic using CSS variables and canvas effects.

## Architecture & Structure
- **Entry Point**: `index.html` contains the main structure and loads all resources.
- **Styling**:
  - `css/base.css`: Core variables, reset, typography, and layout.
  - `css/components.css`: Reusable UI elements (cards, buttons).
  - `css/cyberpunk.css`: Specific overrides and effects for the "Cyber Mode" theme.
- **Logic**:
  - `js/script.js`: Main application logic, event listeners, and the `projects` data object.
  - `js/socials.js`: Handles dynamic injection of social media links.
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
- **Fonts**: Google Fonts (Space Mono) loaded in `index.html`.
- **Icons**: Font Awesome loaded via CDN in `index.html`.
