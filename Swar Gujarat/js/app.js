// js/app.js

class App {
    constructor() {
        this.songs = [];
        this.init();
    }

    async init() {
        let customSongs = [];

        try {
            // Attempt to fetch from Vercel Serverless API (Cloud Database)
            const response = await fetch('/api/songs');
            if (response.ok) {
                const cloudSongs = await response.json();
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
                const res = await fetch('/api/ping', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sessionId })
                });
                if (res.ok) {
                    const data = await res.json();
                    countEl.textContent = data.active || 1;
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
                
                // Update the visual list of songs in the sidebar
                this.renderSongList(filteredSongs);
                
                // Shuffle the filtered songs into random order (Fisher-Yates) for playback
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
                
                // On mobile, don't close sidebar immediately so they can see the songs
                // sidebar.classList.remove('open'); 
            });
        });
        
        // Initial render for 'All'
        this.renderSongList(this.songs);
    }
    
    renderSongList(songs) {
        const listContainer = document.getElementById('category-song-list');
        if (!listContainer) return;
        
        listContainer.innerHTML = '';
        
        if (songs.length === 0) {
            listContainer.innerHTML = '<p style="color: rgba(255,255,255,0.5); font-size: 12px; text-align: center; margin-top: 10px;">No songs in this category</p>';
            return;
        }
        
        songs.forEach((song, index) => {
            const songEl = document.createElement('div');
            songEl.style.display = 'flex';
            songEl.style.alignItems = 'center';
            songEl.style.gap = '10px';
            songEl.style.padding = '8px';
            songEl.style.background = 'rgba(255, 255, 255, 0.05)';
            songEl.style.borderRadius = '8px';
            songEl.style.cursor = 'pointer';
            songEl.style.transition = 'background 0.2s';
            
            songEl.addEventListener('mouseover', () => songEl.style.background = 'rgba(255, 255, 255, 0.15)');
            songEl.addEventListener('mouseout', () => songEl.style.background = 'rgba(255, 255, 255, 0.05)');
            
            songEl.addEventListener('click', () => {
                if (window.player) {
                    // Find index of this specific song in the current active player playlist
                    const playerIndex = window.player.playlist.findIndex(s => s.id === song.id);
                    if (playerIndex !== -1) {
                        window.player.loadTrack(playerIndex);
                        window.player.play();
                    } else {
                        // Fallback: reload this song and play it
                        window.player.loadPlaylist([song, ...window.player.playlist.filter(s => s.id !== song.id)], 0);
                        window.player.play();
                    }
                }
                // Close mobile sidebar on song select
                const sidebar = document.getElementById('category-sidebar');
                if (sidebar) sidebar.classList.remove('open');
            });
            
            songEl.innerHTML = `
                <img src="${song.cover}" style="width: 36px; height: 36px; border-radius: 4px; object-fit: cover;">
                <div style="flex: 1; min-width: 0;">
                    <h4 style="margin: 0; font-size: 12px; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${song.title}</h4>
                    <p style="margin: 2px 0 0 0; font-size: 10px; color: rgba(255,255,255,0.6); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${song.artist}</p>
                </div>
            `;
            listContainer.appendChild(songEl);
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
