// Project Data is now loaded from js/projects-data.js

function openModal(projectId) {
    const modal = document.getElementById('project-modal');
    const data = projects[projectId];
    
    if(data) {
        // Text Content
        document.getElementById('modal-title').innerText = data.title;
        document.getElementById('modal-subtitle').innerText = data.subtitle || '';
        document.getElementById('modal-desc').innerText = data.desc;
        
        // Media
        document.getElementById('modal-main-media').innerHTML = data.heroMedia;
        
        // Meta (Tools & Year)
        const metaContainer = document.getElementById('modal-meta');
        metaContainer.innerHTML = '';
        
        if (data.year) {
            const yearSpan = document.createElement('span');
            yearSpan.className = 'meta-year';
            yearSpan.innerText = data.year;
            metaContainer.appendChild(yearSpan);
        }

        if (data.tools && data.tools.length > 0) {
            data.tools.forEach(tool => {
                const tag = document.createElement('span');
                tag.className = 'meta-tag';
                tag.innerText = tool;
                metaContainer.appendChild(tag);
            });
        }

        // Links
        const linksContainer = document.getElementById('modal-links');
        linksContainer.innerHTML = '';
        if (data.links && data.links.length > 0) {
            data.links.forEach(link => {
                const a = document.createElement('a');
                a.href = link.url;
                a.target = '_blank';
                a.className = 'modal-link-btn';
                a.innerHTML = `${link.text} <i class="fas fa-external-link-alt"></i>`;
                linksContainer.appendChild(a);
            });
        }

        // Gallery (Optional)
        const galleryStrip = document.getElementById('modal-gallery-strip');
        galleryStrip.innerHTML = '';
        if (data.gallery && data.gallery.length > 0) {
            data.gallery.forEach(imgSrc => {
                const img = document.createElement('img');
                img.src = imgSrc;
                img.className = 'gallery-thumb';
                img.onclick = () => {
                    document.getElementById('modal-main-media').innerHTML = `<img src="${imgSrc}" style="width:100%; height:100%; object-fit:contain;">`;
                };
                galleryStrip.appendChild(img);
            });
        }

        modal.classList.add('active');
        document.body.style.overflow = 'hidden'; 
    }
}

function closeModal(e) {
    if (e.target.classList.contains('modal-overlay') || e.target.classList.contains('close-btn')) {
        document.getElementById('project-modal').classList.remove('active');
        document.body.style.overflow = 'auto'; 
    }
}

// --- HACKER TEXT EFFECT ---
const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890!@#$%^&*()_+-=[]{}|;':\",./<>?";

function scrambleText(element) {
    let iteration = 0;
    const originalText = element.dataset.text || element.innerText;
    if (!element.dataset.text) element.dataset.text = originalText;
    clearInterval(element.interval);
    element.interval = setInterval(() => {
        element.innerText = originalText.split("").map((letter, index) => {
            if(index < iteration) return originalText[index];
            return letters[Math.floor(Math.random() * letters.length)];
        }).join("");
        if(iteration >= originalText.length) {
            clearInterval(element.interval);
            element.innerText = originalText; 
        }
        iteration += 1 / 3; 
    }, 30);
}

// --- PLEXUS EFFECT ---
const App = {
    bgCanvas: null,
    ctxPlexus: null,
    particles: [],
    isRunning: false,
    animationFrameId: null,

    initPlexus() {
        this.bgCanvas = document.getElementById('bg-canvas');
        if (!this.bgCanvas) return;
        this.ctxPlexus = this.bgCanvas.getContext('2d');
        this.resizeCanvas(); 
        
        // Only start if Cyber Mode is already active (e.g. persisted state)
        if (document.body.classList.contains('cyber-mode')) {
            this.startAnimation();
        }
    },

    startAnimation() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.animatePlexus();
        }
    },

    stopAnimation() {
        this.isRunning = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
    },

    animatePlexus() {
        if (!this.ctxPlexus || !this.isRunning) return; 
        
        const connectionDistance = 150;
        const connectionDistanceSq = connectionDistance * connectionDistance;

        // Clear with opacity for trail effect
        this.ctxPlexus.fillStyle = 'rgba(3, 3, 3, 0.1)'; 
        this.ctxPlexus.fillRect(0, 0, this.bgCanvas.width, this.bgCanvas.height);
        
        this.particles.forEach(p => { p.update(); p.draw(this.ctxPlexus); });
        
        for (let i = 0; i < this.particles.length; i++) {
            for (let j = i + 1; j < this.particles.length; j++) {
                const dx = this.particles[i].x - this.particles[j].x;
                const dy = this.particles[i].y - this.particles[j].y;
                const distSq = dx * dx + dy * dy;
                
                if (distSq < connectionDistanceSq) {
                    const dist = Math.sqrt(distSq); // Only sqrt for opacity calc
                    const opacity = 0.5 - dist / connectionDistance / 2;
                    this.ctxPlexus.strokeStyle = `rgba(0, 243, 255, ${opacity})`; 
                    this.ctxPlexus.lineWidth = 0.5;
                    this.ctxPlexus.beginPath();
                    this.ctxPlexus.moveTo(this.particles[i].x, this.particles[i].y);
                    this.ctxPlexus.lineTo(this.particles[j].x, this.particles[j].y);
                    this.ctxPlexus.stroke();
                }
            }
        }
        this.animationFrameId = requestAnimationFrame(this.animatePlexus.bind(this));
    },
    resizeCanvas() {
        if (this.bgCanvas) {
            this.bgCanvas.width = window.innerWidth;
            this.bgCanvas.height = window.innerHeight;
            this.particles = [];
            
            // Adjust particle count based on screen size
            // Mobile: Standard density
            // Desktop: Reduced density to avoid "blue blob" effect
            let particleCount;
            if (window.innerWidth < 768) {
                particleCount = 40 + Math.floor(this.bgCanvas.width / 1000 * 20); 
            } else {
                // Reduce count on larger screens
                particleCount = 60 + Math.floor(this.bgCanvas.width / 1000 * 15); 
            }

            for (let i = 0; i < particleCount; i++) {
                this.particles.push(new Particle(this.bgCanvas));
            }
        }
    }
};

class Particle {
    constructor(canvas) {
        this.canvas = canvas;
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 0.8; // Slower movement
        this.vy = (Math.random() - 0.5) * 0.8; 
        
        // Smaller particles on desktop
        if (window.innerWidth > 768) {
            this.size = Math.random() * 1.5 + 0.5; 
        } else {
            this.size = Math.random() * 2 + 1; 
        }
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 0 || this.x > this.canvas.width) this.vx *= -1;
        if (this.y < 0 || this.y > this.canvas.height) this.vy *= -1;
    }
    draw(ctx) {
        ctx.fillStyle = '#00f3ff'; 
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Initialize App
App.initPlexus();
window.addEventListener('resize', App.resizeCanvas.bind(App));

// Cyber Mode Toggle
function toggleCyberMode() {
    document.body.classList.toggle('cyber-mode');
    const btn = document.getElementById('modeBtn');
    const isCyber = document.body.classList.contains('cyber-mode');
    
    if (isCyber) {
        btn.innerText = "EXIT THE VOID";
        const targets = document.querySelectorAll('h1, h2, h3, .logo span, nav a span');
        targets.forEach(el => scrambleText(el));
        App.startAnimation(); // Start canvas loop
    } else {
        btn.innerText = "ENTER THE VOID";
        App.stopAnimation(); // Stop canvas loop to save resources
    }
}

// --- MOBILE MENU ---
function toggleMobileMenu() {
    const nav = document.getElementById('main-nav');
    const hamburger = document.querySelector('.hamburger-menu i');
    
    nav.classList.toggle('active');
    
    // Toggle icon between bars and times (X)
    if (nav.classList.contains('active')) {
        hamburger.classList.remove('fa-bars');
        hamburger.classList.add('fa-times');
    } else {
        hamburger.classList.remove('fa-times');
        hamburger.classList.add('fa-bars');
    }
}

function closeMobileMenu() {
    const nav = document.getElementById('main-nav');
    const hamburger = document.querySelector('.hamburger-menu i');
    
    if (nav.classList.contains('active')) {
        nav.classList.remove('active');
        hamburger.classList.remove('fa-times');
        hamburger.classList.add('fa-bars');
    }
}

// --- GALLERY FILTERING ---
function filterGallery(category) {
    const cards = document.querySelectorAll('.card');
    const buttons = document.querySelectorAll('.tab-btn');
    
    // Update Active Button
    buttons.forEach(btn => {
        btn.classList.remove('active');
        const btnText = btn.innerText.toLowerCase();
        if (category === 'all' && btnText.includes('all')) btn.classList.add('active');
        else if (category === 'games' && btnText.includes('interactive')) btn.classList.add('active');
        else if (category === 'art' && btnText.includes('3d')) btn.classList.add('active');
        else if (category === 'videos' && btnText.includes('videos')) btn.classList.add('active');
    });

    // Filter Cards
    cards.forEach(card => {
        // Reset animation
        card.classList.remove('fade-in');
        
        if (category === 'all') {
            card.classList.remove('hidden');
            setTimeout(() => card.classList.add('fade-in'), 50);
        } else {
            if (card.classList.contains(`category-${category}`)) {
                card.classList.remove('hidden');
                setTimeout(() => card.classList.add('fade-in'), 50);
            } else {
                card.classList.add('hidden');
            }
        }
    });
}

// --- HOBBY EASTER EGG ---
function openHobby(type) {
    const modal = document.getElementById('hobby-modal');
    const content = document.getElementById('hobby-content');
    
    if (type === 'gaming') {
        content.innerHTML = `
            <i class="fab fa-steam" style="font-size: 4rem; color: #fff; margin-bottom: 1rem; text-shadow: 0 0 15px #00d2ff;"></i>
            <h2 style="margin-bottom: 0.5rem;">Steam Profile</h2>
            <p style="color: #ccc; margin-bottom: 2rem;">Check out my library and achievements.</p>
            <a href="https://steamcommunity.com/profiles/76561199041287248/" target="_blank" class="cta-btn" style="display: inline-block; background: #171a21; border: 1px solid #00d2ff; color: #00d2ff;">Visit Profile</a>
        `;
    } else if (type === 'movies') {
        content.innerHTML = `
            <i class="fas fa-film" style="font-size: 4rem; color: #fff; margin-bottom: 1rem; text-shadow: 0 0 15px #40bcf4;"></i>
            <h2 style="margin-bottom: 0.5rem;">Letterboxd</h2>
            <p style="color: #ccc; margin-bottom: 2rem;">See what I've been watching lately.</p>
            <a href="https://boxd.it/ebP01" target="_blank" class="cta-btn" style="display: inline-block; background: #14181c; border: 1px solid #40bcf4; color: #40bcf4;">Visit Profile</a>
        `;
    }
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeHobbyModal(e) {
    if (e.target.classList.contains('modal-overlay') || e.target.classList.contains('close-btn')) {
        document.getElementById('hobby-modal').classList.remove('active');
        document.body.style.overflow = 'auto';
    }
}

/* --- Service Page Logic --- */
function switchProcess(processId) {
    // Hide all process steps
    const allSteps = document.querySelectorAll('.process-steps');
    allSteps.forEach(step => {
        step.classList.remove('active');
    });

    // Show the selected process step
    const selectedStep = document.getElementById('process-' + processId);
    if (selectedStep) {
        selectedStep.classList.add('active');
    }

    // Update tab buttons
    const allBtns = document.querySelectorAll('.process-tab-btn');
    allBtns.forEach(btn => {
        btn.classList.remove('active');
        // Check if this button's onclick matches the processId
        if (btn.getAttribute('onclick').includes(`'${processId}'`)) {
            btn.classList.add('active');
        }
    });

    // Sync with Service View (if not already active)
    const serviceView = document.getElementById('service-view-' + processId);
    if (serviceView && !serviceView.classList.contains('active')) {
        showService(processId);
    }
}

/* --- Service Master-Detail Logic --- */
function showService(serviceId) {
    // 1. Update Menu Buttons
    const allBtns = document.querySelectorAll('.service-menu-btn');
    allBtns.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('onclick').includes(`'${serviceId}'`)) {
            btn.classList.add('active');
        }
    });

    // 2. Update Display Content
    const allViews = document.querySelectorAll('.service-detail-view');
    allViews.forEach(view => {
        view.classList.remove('active');
    });

    const selectedView = document.getElementById('service-view-' + serviceId);
    if (selectedView) {
        selectedView.classList.add('active');
    }

    // Sync with Process View (if not already active)
    const processStep = document.getElementById('process-' + serviceId);
    if (processStep && !processStep.classList.contains('active')) {
        switchProcess(serviceId);
    }
}

// Handle Hash on Load (for Services Page Deep Linking)
window.addEventListener('DOMContentLoaded', () => {
    // Check if we are on the services page
    if (window.location.pathname.includes('services.html')) {
        const hash = window.location.hash.replace('#', '');
        if (hash) {
            // If hash exists (e.g. #assets), show that service
            showService(hash);
            // Also switch process tab if it exists
            switchProcess(hash);
        } else {
            // Default to first one
            showService('assets');
            switchProcess('assets');
        }
    }
});

/* --- ACHIEVEMENT DATA LOG --- */
const achievementData = {
    'sae': {
        title: "Game Art & 3D Animation",
        icon: "fas fa-graduation-cap",
        modules: [
            "High-Poly & Low-Poly Modeling (Maya, ZBrush)",
            "PBR Texturing & Shading (Substance Painter)",
            "Character Design & Anatomy",
            "Rigging & Animation Principles",
            "Level Design & Environmental Storytelling",
            "Game Engine Integration (Unreal Engine / Unity)",
            "Compositing & Post-Processing"
        ],
        softSkills: [
            "Agile Project Management",
            "Team Collaboration",
            "Creative Problem Solving"
        ]
    },
    'kv': {
        title: "Commercial Basic Training (EFZ)",
        icon: "fas fa-certificate",
        modules: [
            "Financial Accounting & Controlling",
            "Economics & Law",
            "Information, Communication & Administration (IKA)",
            "Project Management Basics",
            "Business English (B2)",
            "Business French (B1)"
        ],
        softSkills: [
            "Professional Communication",
            "Customer Service",
            "Organizational Skills"
        ]
    }
};

function showAchievement(id) {
    const data = achievementData[id];
    if (!data) return;

    const modal = document.getElementById('achievement-modal');
    const content = document.getElementById('achievement-data-content');

    let modulesHtml = data.modules.map(m => `<li><i class="fas fa-caret-right"></i> ${m}</li>`).join('');
    let softSkillsHtml = data.softSkills.map(s => `<li><i class="fas fa-check"></i> ${s}</li>`).join('');

    content.innerHTML = `
        <div class="achievement-header">
            <i class="${data.icon}"></i>
            <div>
                <h2 style="font-family: 'Space Mono', monospace;">${data.title}</h2>
                <span style="color: #888; font-size: 0.8rem;">DATA LOG ACCESSED</span>
            </div>
        </div>
        
        <div class="data-section-title">Core Modules</div>
        <ul class="data-list">
            ${modulesHtml}
        </ul>

        <div class="data-section-title">Acquired Skills</div>
        <ul class="data-list">
            ${softSkillsHtml}
        </ul>
    `;

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeAchievementModal(e) {
    if (e.target.classList.contains('modal-overlay') || e.target.classList.contains('close-btn') || e.target.closest('.close-btn')) {
        document.getElementById('achievement-modal').classList.remove('active');
        document.body.style.overflow = 'auto';
    }
}

// Contact Modal Functions
function openContactModal() {
    const modal = document.getElementById('contact-modal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent scrolling
        
        // Reset states when opening
        const terminal = modal.querySelector('.terminal-window');
        if(terminal) {
            terminal.classList.remove('minimized', 'maximized');
        }
        modal.classList.remove('minimized-overlay');
    }
}

function closeContactModal(e) {
    // Check if clicked overlay OR the close button (X) OR the red terminal dot
    if (e.target.id === 'contact-modal' || 
        e.target.classList.contains('close-btn') || 
        e.target.classList.contains('close')) {
        
        const modal = document.getElementById('contact-modal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = 'auto'; // Restore scrolling
        }
    }
}

// Terminal Window Functions
function minimizeTerminal(e) {
    e.stopPropagation();
    const terminal = document.querySelector('.terminal-window');
    const modal = document.getElementById('contact-modal');
    
    // Toggle minimized state
    const isMinimized = terminal.classList.toggle('minimized');
    
    if (isMinimized) {
        modal.classList.add('minimized-overlay');
        terminal.classList.remove('maximized');
        document.body.style.overflow = 'auto'; // Allow scrolling website
    } else {
        modal.classList.remove('minimized-overlay');
        document.body.style.overflow = 'hidden'; // Lock scrolling
    }
}

function maximizeTerminal(e) {
    e.stopPropagation();
    const terminal = document.querySelector('.terminal-window');
    const modal = document.getElementById('contact-modal');

    // Toggle maximized state
    const isMaximized = terminal.classList.toggle('maximized');
    
    if (isMaximized) {
        terminal.classList.remove('minimized');
        modal.classList.remove('minimized-overlay');
        document.body.style.overflow = 'hidden';
    }
}

// Secure Form Handling (Obfuscation)
function handleContactSubmit(e) {
    e.preventDefault(); // Stop default submission
    
    const form = e.target;
    const btn = form.querySelector('button[type="submit"]');
    
    // Visual Feedback
    const originalText = btn.innerText;
    btn.innerText = "> ENCRYPTING_DATA...";
    btn.style.opacity = "0.7";
    
    // Reconstruct Email (Split to hide from simple scrapers)
    const part1 = 'micael';
    const part2 = 'gomes-fernandes';
    const part3 = 'ch';
    const target = `${part1}@${part2}.${part3}`;
    
    // Set the action dynamically
    form.action = `https://formsubmit.co/${target}`;
    
    // Submit after a short "processing" delay for effect
    setTimeout(() => {
        btn.innerText = "> TRANSMITTING...";
        form.submit();
    }, 1000);
}