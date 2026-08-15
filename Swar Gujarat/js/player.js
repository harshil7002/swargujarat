// js/player.js

// Initialize YouTube API
let tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
let firstScriptTag = document.getElementsByTagName('script')[0];
if (firstScriptTag) {
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
} else {
    document.head.appendChild(tag);
}

let ytPlayerReady = false;
let ytPlayer;

window.onYouTubeIframeAPIReady = function() {
    ytPlayer = new YT.Player('yt-player-container', {
        height: '0',
        width: '0',
        videoId: 'M7lc1UVf-VE', // Must provide a valid ID to initialize properly
        playerVars: {
            'playsinline': 1,
            'controls': 0,
            'disablekb': 1,
            'origin': window.location.protocol === 'file:' ? '*' : window.location.origin
        },
        events: {
            'onReady': () => {
                ytPlayerReady = true;
                if (window.player && window.player.queuedVideoId) {
                    ytPlayer.loadVideoById(window.player.queuedVideoId);
                    if (!window.player.isPlaying) ytPlayer.pauseVideo();
                }
            },
            'onStateChange': (event) => {
                if (window.player) window.player.onYTStateChange(event);
            }
        }
    });
};

class MusicPlayer {
    constructor() {
        this.playlist = [];
        this.currentIndex = 0;
        this.isPlaying = false;
        
        this.initDOM();
        this.bindEvents();
        
        // Start checking progress
        setInterval(() => this.updateProgress(), 500);
    }

    initDOM() {
        this.playPauseBtn = document.getElementById('play-pause-btn');
        if (this.playPauseBtn) {
            this.playIcon = this.playPauseBtn.querySelector('.play-icon');
            this.pauseIcon = this.playPauseBtn.querySelector('.pause-icon');
        }
        
        this.prevBtn = document.getElementById('prev-btn');
        this.nextBtn = document.getElementById('next-btn');
        
        this.coverEl = document.getElementById('player-cover');
        this.titleEl = document.getElementById('player-title');
        this.artistEl = document.getElementById('player-artist');
        
        this.currentTimeEl = document.getElementById('current-time');
        this.totalTimeEl = document.getElementById('total-time');
        
        this.progressBg = document.getElementById('progress-bar-bg');
        this.progressFill = document.getElementById('progress-bar-fill');
    }

    bindEvents() {
        if (this.playPauseBtn) this.playPauseBtn.addEventListener('click', () => this.togglePlay());
        if (this.nextBtn) this.nextBtn.addEventListener('click', () => this.nextTrack());
        if (this.prevBtn) this.prevBtn.addEventListener('click', () => this.prevTrack());

        if (this.progressBg) {
            this.progressBg.addEventListener('click', (e) => this.seek(e));
        }

        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            switch(e.code) {
                case 'Space':
                    e.preventDefault();
                    this.togglePlay();
                    break;
                case 'ArrowRight':
                    this.nextTrack();
                    break;
                case 'ArrowLeft':
                    this.prevTrack();
                    break;
            }
        });
    }

    loadPlaylist(songs, startIndex = 0) {
        this.playlist = songs;
        this.currentIndex = startIndex;
        
        if (this.playlist.length === 0) {
            this.clearUI();
            return;
        }

        this.loadTrack(this.currentIndex);
    }

    clearUI() {
        if (this.titleEl) this.titleEl.textContent = 'No Songs Found';
        if (this.artistEl) this.artistEl.textContent = 'Empty Category';
        if (this.coverEl) this.coverEl.src = 'assets/swar.png'; // Default
        
        if (ytPlayerReady && ytPlayer && typeof ytPlayer.stopVideo === 'function') {
            ytPlayer.stopVideo();
        }
        
        const upNextCard = document.getElementById('up-next-card');
        if (upNextCard) upNextCard.classList.remove('show');
    }

    loadTrack(index) {
        const track = this.playlist[index];
        if (!track) return;
        
        if (this.titleEl) this.titleEl.textContent = track.title;
        if (this.artistEl) this.artistEl.textContent = track.artist;
        if (this.coverEl) {
            this.coverEl.src = track.cover;
            this.coverEl.classList.remove('spin');
        }
        
        if (this.progressFill) this.progressFill.style.width = '0%';
        if (this.currentTimeEl) this.currentTimeEl.textContent = '0:00';
        
        // Handle YouTube video load
        if (track.id !== 'dummy') {
            if (ytPlayerReady && ytPlayer) {
                ytPlayer.loadVideoById(track.id);
                if (!this.isPlaying) {
                    ytPlayer.pauseVideo();
                }
            } else {
                this.queuedVideoId = track.id;
            }
        }
        
        // Hide Up Next card when new song loads
        const upNextCard = document.getElementById('up-next-card');
        if (upNextCard) upNextCard.classList.remove('show');
    }

    onYTStateChange(event) {
        // YT.PlayerState.PLAYING = 1
        // YT.PlayerState.ENDED = 0
        if (event.data === 1) { // PLAYING
            this.syncUIPlayState(true);
            if (this.totalTimeEl && ytPlayer) {
                this.totalTimeEl.textContent = this.formatTime(ytPlayer.getDuration());
            }
        } else if (event.data === 2) { // PAUSED
            this.syncUIPlayState(false);
        } else if (event.data === 0) { // ENDED
            this.onTrackEnd();
        }
    }

    togglePlay() {
        if (this.playlist.length === 0) return;
        
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    play() {
        if (ytPlayerReady && ytPlayer) {
            ytPlayer.playVideo();
        }
        this.syncUIPlayState(true);
    }

    pause() {
        if (ytPlayerReady && ytPlayer) {
            ytPlayer.pauseVideo();
        }
        this.syncUIPlayState(false);
    }
    
    syncUIPlayState(isPlaying) {
        this.isPlaying = isPlaying;
        if (this.playIcon) this.playIcon.style.display = isPlaying ? 'none' : 'block';
        if (this.pauseIcon) this.pauseIcon.style.display = isPlaying ? 'block' : 'none';
        
        if (this.coverEl) {
            if (isPlaying) {
                this.coverEl.classList.add('spin');
            } else {
                this.coverEl.classList.remove('spin');
            }
        }
    }

    updateProgress() {
        if (!ytPlayerReady || !ytPlayer || !this.isPlaying) return;
        
        try {
            const current = ytPlayer.getCurrentTime() || 0;
            const duration = ytPlayer.getDuration() || 1;
            const percent = (current / duration) * 100;
            
            if (this.progressFill) this.progressFill.style.width = `${percent}%`;
            if (this.currentTimeEl) this.currentTimeEl.textContent = this.formatTime(current);
            if (this.totalTimeEl) this.totalTimeEl.textContent = this.formatTime(duration);
            
            // Up Next Logic (60 seconds remaining)
            const remaining = duration - current;
            const upNextCard = document.getElementById('up-next-card');
            
            if (upNextCard) {
                if (remaining <= 60 && remaining > 0 && this.playlist.length > 1) {
                    if (!upNextCard.classList.contains('show')) {
                        let nextIndex = (this.currentIndex + 1) % this.playlist.length;
                        document.getElementById('up-next-title').textContent = this.playlist[nextIndex].title;
                        document.getElementById('up-next-artist').textContent = this.playlist[nextIndex].artist;
                        document.getElementById('up-next-cover').src = this.playlist[nextIndex].cover;
                        upNextCard.classList.add('show');
                    }
                } else if (remaining > 60) {
                    upNextCard.classList.remove('show');
                }
            }
            
        } catch(e) {}
    }

    seek(e) {
        if (!this.progressBg || !ytPlayerReady || !ytPlayer) return;
        const rect = this.progressBg.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        
        try {
            const duration = ytPlayer.getDuration();
            if (duration) {
                ytPlayer.seekTo(pos * duration, true);
            }
        } catch(e) {}
    }

    nextTrack() {
        if (this.playlist.length === 0) return;
        
        // If there's only 1 song, just replay it from the beginning
        if (this.playlist.length === 1) {
            if (ytPlayerReady && ytPlayer) {
                ytPlayer.seekTo(0, true);
                ytPlayer.playVideo();
            }
            return;
        }

        this.currentIndex = (this.currentIndex + 1) % this.playlist.length;
        this.loadTrack(this.currentIndex);
        this.play();
    }

    prevTrack() {
        if (this.playlist.length === 0) return;
        
        try {
            const current = ytPlayer.getCurrentTime() || 0;
            // If we are past 3 seconds, OR if there's only 1 song, restart the current song
            if (current > 3 || this.playlist.length === 1) {
                ytPlayer.seekTo(0, true);
                if (this.isPlaying) ytPlayer.playVideo();
                return;
            }
        } catch(e) {}
        
        this.currentIndex = (this.currentIndex - 1 + this.playlist.length) % this.playlist.length;
        this.loadTrack(this.currentIndex);
        this.play();
    }

    onTrackEnd() {
        this.nextTrack();
    }

    formatTime(seconds) {
        if (!seconds || isNaN(seconds)) return '0:00';
        const min = Math.floor(seconds / 60);
        const sec = Math.floor(seconds % 60);
        return `${min}:${sec.toString().padStart(2, '0')}`;
    }
}

window.player = new MusicPlayer();
