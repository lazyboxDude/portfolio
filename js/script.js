// Project Data
const projects = {
    'aphonia': {
        title: 'Aphonia',
        desc: 'A narrative puzzle game about the erosion of sound and the act of listening. Players accompany Leelo, a mute being with an extraordinary sensitivity to what others no longer notice.',
        content: '<div style="padding:20px; text-align:center;"><h3>Aphonia</h3><p>Currently in development by Moonflux Interactive.</p><a href="https://store.steampowered.com/app/4025110/Aphonia__Leelos_Journey_to_Harmony/" target="_blank" style="color:#00d2ff;">Wishlist on Steam</a></div>'
    },
    'dolphinrush': {
        title: 'Dolphin Rush',
        desc: 'Created for Whale and Dolphin Conservation. An interactive experience raising awareness for marine life preservation.',
        content: '<div style="padding:20px; text-align:center;"><h3>Dolphin Rush</h3><p>A game created for the Whale and Dolphin Conservation.</p><a href="https://moonflux-interactive.com" target="_blank" style="color:#00d2ff;">Learn More</a></div>'
    },
    'bf': {
        title: 'BF',
        desc: '3D Composition',
        content: '<img src="images/portfolio/BF.png" alt="BF" style="width:100%; height:100%; object-fit:contain;">'
    },
    'fbdnl': {
        title: 'FBDNL',
        desc: 'Digital Art',
        content: '<img src="images/portfolio/FBDNL.png" alt="FBDNL" style="width:100%; height:100%; object-fit:contain;">'
    },
    'fridom': {
        title: 'Fridom',
        desc: 'Concept Art',
        content: '<img src="images/portfolio/Fridom.png" alt="Fridom" style="width:100%; height:100%; object-fit:contain;">'
    },
    'fys02': {
        title: 'FYS 02',
        desc: 'Abstract Design',
        content: '<img src="images/portfolio/fys02.png" alt="FYS 02" style="width:100%; height:100%; object-fit:contain;">'
    },
    'gone': {
        title: 'Gone',
        desc: 'Atmospheric Render',
        content: '<img src="images/portfolio/Gone.png" alt="Gone" style="width:100%; height:100%; object-fit:contain;">'
    },
    'sunshine': {
        title: 'Sunshine',
        desc: 'Lighting Study',
        content: '<img src="images/portfolio/Sunshine.png" alt="Sunshine" style="width:100%; height:100%; object-fit:contain;">'
    },
    'thoughts': {
        title: 'Thoughts',
        desc: 'Surreal Composition',
        content: '<img src="images/portfolio/Thoughts.png" alt="Thoughts" style="width:100%; height:100%; object-fit:contain;">'
    },
    'underthebridge': {
        title: 'Under The Bridge',
        desc: 'Environment Art',
        content: '<img src="images/portfolio/UnderTheBridge.png" alt="Under The Bridge" style="width:100%; height:100%; object-fit:contain;">'
    }
};

function openModal(projectId) {
    const modal = document.getElementById('project-modal');
    const data = projects[projectId];
    
    if(data) {
        document.getElementById('modal-title').innerText = data.title;
        document.getElementById('modal-desc').innerText = data.desc;
        document.getElementById('modal-img').innerHTML = data.content; 
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
        const targets = document.querySelectorAll('h1, h2, h3, .logo, nav a');
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