# Images Folder

This folder contains all images and visual assets for the Lazybox Studio portfolio website.

## Folder Structure

```
images/
├── portfolio/       # Your 3D work, renders, and project images
├── backgrounds/     # Background images and textures
├── icons/           # Icons and small graphics
└── logos/           # Logo files and branding assets
```

## Usage Guidelines

### Portfolio Images (`portfolio/`)
- Upload your 3D renders, artwork, and project screenshots here
- Recommended formats: JPG, PNG, WebP
- Suggested naming: `project-name-01.jpg`, `cyberpunk-vehicle.png`, etc.
- For optimal web performance, keep file sizes under 2MB

### Background Images (`backgrounds/`)
- Background images and texture overlays
- Use for hero sections or decorative elements

### Icons (`icons/`)
- Small UI elements, skill icons, or decorative graphics
- Recommended format: SVG (scalable) or PNG with transparent background

### Logos (`logos/`)
- Lazybox Studio logo variations
- Brand assets and identity files

## Best Practices

1. **File Naming**: Use lowercase with hyphens (e.g., `my-awesome-project.jpg`)
2. **Optimization**: Compress images before uploading to reduce load times
3. **Formats**: 
   - Photos/Renders: JPG or WebP
   - Graphics with transparency: PNG
   - Logos/Icons: SVG preferred
4. **Dimensions**: Consider responsive design - provide images at reasonable sizes

## Linking Images in HTML

To use images from this folder in your `index.html`:

```html
<!-- Example for portfolio image -->
<img src="images/portfolio/project-name.jpg" alt="Project Description">

<!-- Example for background -->
<div style="background-image: url('images/backgrounds/hero-bg.jpg')"></div>

<!-- Example for logo -->
<img src="images/logos/studio-logo.svg" alt="Lazybox Studio">
```

## Notes

- All image paths are relative to the root `index.html` file
- Empty `.gitkeep` files maintain folder structure in version control
- Update image references in `index.html` after adding your pictures
