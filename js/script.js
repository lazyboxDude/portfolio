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
    initPlexus() {
        this.bgCanvas = document.getElementById('bg-canvas');
        this.ctxPlexus = this.bgCanvas.getContext('2d');
        this.resizeCanvas(); 
        this.animatePlexus();
    },
    animatePlexus() {
        if (!this.ctxPlexus) return; 
        const connectionDistance = 150;
        // Clear with opacity for trail effect
        this.ctxPlexus.fillStyle = 'rgba(3, 3, 3, 0.1)'; 
        this.ctxPlexus.fillRect(0, 0, this.bgCanvas.width, this.bgCanvas.height);
        
        this.particles.forEach(p => { p.update(); p.draw(this.ctxPlexus); });
        for (let i = 0; i < this.particles.length; i++) {
            for (let j = i + 1; j < this.particles.length; j++) {
                const dx = this.particles[i].x - this.particles[j].x;
                const dy = this.particles[i].y - this.particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < connectionDistance) {
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
        requestAnimationFrame(this.animatePlexus.bind(this));
    },
    resizeCanvas() {
        if (this.bgCanvas) {
            this.bgCanvas.width = window.innerWidth;
            this.bgCanvas.height = window.innerHeight;
            this.particles = [];
            const particleCount = 50 + Math.floor(this.bgCanvas.width / 1000 * 30); 
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
        this.vx = (Math.random() - 0.5) * 1.0; 
        this.vy = (Math.random() - 0.5) * 1.0; 
        this.size = Math.random() * 2 + 1; 
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
    } else {
        btn.innerText = "ENTER THE VOID";
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
        if (btn.innerText.toLowerCase().includes(category === 'all' ? 'all' : (category === 'games' ? 'interactive' : '3d'))) {
            btn.classList.add('active');
        }
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