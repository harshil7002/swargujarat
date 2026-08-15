// js/app.js

class App {
    constructor() {
        this.songs = [];
        this.init();
    }

    async init() {
        let customSongs = [];

        try {
            // Fetch directly from Upstash Redis (Cloud Database)
            const upstashUrl = "https://integral-puma-108532.upstash.io";
            const token = "gQAAAAAAAaf0AAIgcDFhZGFkNjdmNDllNWM0MjEzYTYwYmM0OTBmNzM0MzFkYQ";
            
            const response = await fetch(`${upstashUrl}/get/swar_playlist`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                let cloudSongs = [];
                if (data.result) {
                    cloudSongs = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
                }
                
                if (Array.isArray(cloudSongs) && cloudSongs.length > 0) {
                    customSongs = cloudSongs;
                    console.log("Successfully loaded songs from Cloud Database!");
                }
            } else {
                console.warn("Cloud Database not connected, falling back to local storage.");
            }
        } catch (error) {
            console.warn("API route missing (running locally without Vercel), falling back to local storage.");
        }

        // Fallback to localStorage if cloud is empty or inaccessible
        if (customSongs.length === 0) {
            customSongs = JSON.parse(localStorage.getItem('customSongs')) || [];
        }
        
        // If STILL empty, load a default Gujarati song
        if (customSongs.length === 0) {
            customSongs = [{
                id: '8vEa-sTj-4w', // Real YouTube ID for a popular song
                title: 'Vahali Dikari',
                artist: 'Kirtidan Gadhvi',
                cover: 'https://img.youtube.com/vi/8vEa-sTj-4w/maxresdefault.jpg',
                duration: '4:32'
            }];
        }

        this.songs = customSongs;

        // Shuffle initial playlist (Fisher-Yates) so songs play in random order
        let shuffled = [...this.songs];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        // Load shuffled playlist to player
        if (shuffled.length > 0) {
            window.player.loadPlaylist(shuffled, 0);
        }

        this.initClock();
        this.initLiveData();
        this.initCategories();
        this.initParticles();
    }

    initLiveData() {
        const countEl = document.getElementById('online-count');
        if (!countEl) return;
        
        // Create a unique session ID for this user's tab
        let sessionId = sessionStorage.getItem('swar_session_id');
        if (!sessionId) {
            sessionId = 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
            sessionStorage.setItem('swar_session_id', sessionId);
        }
        
        const pingServer = async () => {
            try {
                const upstashUrl = "https://integral-puma-108532.upstash.io";
                const token = "gQAAAAAAAaf0AAIgcDFhZGFkNjdmNDllNWM0MjEzYTYwYmM0OTBmNzM0MzFkYQ";
                
                const now = Date.now();
                const expireTime = now - 45000;
                
                const pipeline = [
                    ["ZADD", "active_users", now.toString(), sessionId],
                    ["ZREMRANGEBYSCORE", "active_users", "-inf", expireTime.toString()],
                    ["ZCARD", "active_users"]
                ];
                
                const res = await fetch(`${upstashUrl}/pipeline`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                    body: JSON.stringify(pipeline)
                });
                
                if (res.ok) {
                    const results = await res.json();
                    let activeCount = 1;
                    if (Array.isArray(results) && results[2] && results[2].result !== undefined) {
                        activeCount = results[2].result;
                    }
                    countEl.textContent = activeCount;
                }
            } catch (e) {
                console.warn("Ping failed, showing 1");
                countEl.textContent = 1;
            }
        };
        
        // Ping immediately on load
        pingServer();
        
        // Ping every 30 seconds to keep the session alive
        setInterval(pingServer, 30000);
    }

    initCategories() {
        const toggleBtn = document.getElementById('category-toggle-btn');
        const sidebar = document.getElementById('category-sidebar');
        const catButtons = document.querySelectorAll('.category-btn');
        
        if (!toggleBtn || !sidebar) return;

        // Mobile toggle logic
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('open');
        });

        // Close mobile drawer when clicking outside
        document.addEventListener('click', (e) => {
            if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && !toggleBtn.contains(e.target)) {
                sidebar.classList.remove('open');
            }
        });

        // Category filtering
        catButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                // Update active state
                catButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Get selected category
                const selectedCat = btn.getAttribute('data-cat');
                
                // Filter songs
                let filteredSongs = [...this.songs]; // Clone the array
                if (selectedCat !== 'All') {
                    filteredSongs = this.songs.filter(song => {
                        // Handle legacy songs that might not have a category yet
                        const songCat = song.category || 'All Songs';
                        return songCat.includes(selectedCat);
                    });
                }
                
                // Shuffle the filtered songs into random order (Fisher-Yates)
                for (let i = filteredSongs.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [filteredSongs[i], filteredSongs[j]] = [filteredSongs[j], filteredSongs[i]];
                }
                
                // Load shuffled playlist (even if empty)
                if (window.player) {
                    window.player.loadPlaylist(filteredSongs, 0);
                    // Force play if possible
                    setTimeout(() => {
                        if (window.player.player && typeof window.player.player.playVideo === 'function' && filteredSongs.length > 0) {
                            window.player.player.playVideo();
                        }
                    }, 500);
                }
                
                // Close drawer on mobile
                sidebar.classList.remove('open');
            });
        });
    }

    initClock() {
        const clockEl = document.getElementById('real-time-clock');
        if (!clockEl) return;

        let showColon = true;

        const updateClock = () => {
            const now = new Date();
            let hours = now.getHours();
            let minutes = now.getMinutes();
            const ampm = hours >= 12 ? 'pm' : 'am';
            
            hours = hours % 12;
            hours = hours ? hours : 12; // the hour '0' should be '12'
            minutes = minutes < 10 ? '0' + minutes : minutes;
            
            const colon = showColon ? ':' : '<span style="visibility:hidden">:</span>';
            showColon = !showColon;
            
            clockEl.innerHTML = `${hours}${colon}${minutes} ${ampm}`;
        };

        // Update immediately and then every half second for blinking effect
        updateClock();
        setInterval(updateClock, 1000);
    }

    initParticles() {
        const canvas = document.getElementById('particles-canvas');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        const particles = [];
        const particleCount = 40;
        
        for(let i = 0; i < particleCount; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                radius: Math.random() * 2,
                speedX: Math.random() * 0.5 - 0.25,
                speedY: Math.random() * -0.5 - 0.1,
                alpha: Math.random() * 0.5 + 0.1
            });
        }
        
        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Only draw if playing
            if (window.player && window.player.isPlaying) {
                particles.forEach(p => {
                    p.x += p.speedX;
                    p.y += p.speedY;
                    
                    if (p.y < 0) {
                        p.y = canvas.height;
                        p.x = Math.random() * canvas.width;
                    }
                    
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(232, 93, 42, ${p.alpha})`; // Accent color
                    ctx.fill();
                });
            }
            
            requestAnimationFrame(animate);
        }
        
        animate();
        
        window.addEventListener('resize', () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
