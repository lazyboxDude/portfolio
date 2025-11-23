// --- SOCIAL MEDIA LINKS CONFIGURATION ---
// Edit the URLs below to update your social media links.
// You can add more links by copying one of the blocks { ... },
const socialLinks = [
    {
        platform: "Instagram",
        url: "https://www.instagram.com/_.lazybox._/?igsh=MWludGQwczk2NWg4bw%3D%3D&utm_source=qr#",
        icon: "fab fa-instagram"
    },
    {
        platform: "YouTube",
        url: "https://youtube.com/@-.lazybox.-?si=B0pnZTSiJQTugKN_",
        icon: "fab fa-youtube"
    },
    {
        platform: "Fiverr",
        url: "http://www.fiverr.com/s/VYqBbez",
        // Custom HTML for Fiverr logo style
        customHtml: '<span style="font-weight: bold; font-family: sans-serif; font-size: 0.9rem;">fi</span>'
    },
    {
        platform: "GitHub",
        url: "https://github.com/lazyboxDude",
        icon: "fab fa-github"
    }
];

// --- RENDER LOGIC (DO NOT EDIT BELOW THIS LINE) ---
document.addEventListener('DOMContentLoaded', () => {
    const container = document.querySelector('.social-links');
    if (!container) return;

    container.innerHTML = socialLinks.map(link => {
        const content = link.customHtml ? link.customHtml : `<i class="${link.icon}"></i>`;
        return `<a href="${link.url}" target="_blank" class="social-btn" title="${link.platform}">${content}</a>`;
    }).join('');
});
