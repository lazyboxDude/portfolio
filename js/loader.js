const sidebarHTML = `
    <div class="logo">
        <span class="logo-main" data-text="Lazybox">Lazybox</span>
        <span class="logo-sub" data-text="by Micael G. Fernandes">by Micael G. Fernandes</span>
    </div>
    <div class="hamburger-menu" onclick="toggleMobileMenu()">
        <i class="fas fa-bars"></i>
    </div>
    <nav id="main-nav">
        <a href="index.html" onclick="closeMobileMenu()"><i class="fas fa-home"></i> <span data-text="Home">Home</span></a>
        <a href="index.html#about" onclick="closeMobileMenu()"><i class="fas fa-user"></i> <span data-text="Who I am">Who I am</span></a>
        <a href="index.html#skills" onclick="closeMobileMenu()"><i class="fas fa-tools"></i> <span data-text="Skills">Skills</span></a>
        <a href="index.html#work" onclick="closeMobileMenu()"><i class="fas fa-cubes"></i> <span data-text="Portfolio">Portfolio</span></a>
        <a href="services.html" onclick="closeMobileMenu()"><i class="fas fa-handshake"></i> <span data-text="Services">Services</span></a>
        <a href="resume.html" onclick="closeMobileMenu()"><i class="fas fa-id-card"></i> <span data-text="Resume">Resume</span></a>
    
        <button id="modeBtn" class="funky-btn" onclick="toggleCyberMode(); closeMobileMenu()">ENTER THE VOID</button>

        <div class="sidebar-footer">
            <div class="social-links"></div>
            <button onclick="openContactModal(); closeMobileMenu()" class="cta-btn" style="width: 100%; cursor: pointer;">Get in Touch</button>
        </div>
    </nav>
`;

function loadSidebar() {
    const header = document.querySelector('header');
    if (!header) return;

    header.innerHTML = sidebarHTML;
    
    // Highlight active link
    highlightActiveLink();
    
    // Initialize Socials (from socials.js)
    if (window.initSocials) {
        window.initSocials();
    }
    
    // Initialize Cyber Mode Button Text
    updateCyberButton();
}

function highlightActiveLink() {
    const path = window.location.pathname;
    const page = path.split('/').pop() || 'index.html';
    const hash = window.location.hash;
    
    const links = document.querySelectorAll('#main-nav a');
    
    // Remove all active classes first
    links.forEach(link => link.classList.remove('active'));

    // Find the link that matches the current page
    let activeLink = null;

    // 1. Exact match on filename (e.g. services.html, resume.html)
    activeLink = document.querySelector(`#main-nav a[href="${page}"]`);

    // 2. If no exact match, check for index.html special case
    if (!activeLink && (page === 'index.html' || page === '')) {
        // If we have a hash, try to match the hash link (e.g. index.html#about)
        if (hash) {
            activeLink = document.querySelector(`#main-nav a[href="index.html${hash}"]`);
        }
        // If still no match (or no hash), default to Home
        if (!activeLink) {
            activeLink = document.querySelector(`#main-nav a[href="index.html"]`);
        }
    }

    if (activeLink) {
        activeLink.classList.add('active');
    }
}

function updateCyberButton() {
    const btn = document.getElementById('modeBtn');
    if (btn && document.body.classList.contains('cyber-mode')) {
        btn.innerText = "EXIT THE VOID";
    }
}

document.addEventListener('DOMContentLoaded', loadSidebar);