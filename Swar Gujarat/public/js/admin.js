// js/admin.js

document.addEventListener('DOMContentLoaded', () => {
    // --- Login Logic ---
    const loginForm = document.getElementById('login-form');
    const loginPanel = document.getElementById('login-panel');
    const dashboardPanels = document.getElementById('dashboard-panels');
    const adminContainer = document.querySelector('.admin-container');
    const loginError = document.getElementById('login-error');
    const adminHeaderTitle = document.querySelector('.admin-header h1');
    const logoutBtn = document.getElementById('logout-btn');

    // Check if already authenticated
    fetch('/api/check-auth', { credentials: 'same-origin' }).then(res => res.json()).then(data => {
        if (data.authenticated) {
            loginPanel.style.display = 'none';
            dashboardPanels.style.display = 'flex';
            adminContainer.classList.add('dashboard-mode');
            adminHeaderTitle.textContent = 'Admin Dashboard';
            logoutBtn.style.display = 'block';
            renderManageList();
        }
    }).catch(e => {});

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('admin-id').value;
            const pass = document.getElementById('admin-pass').value;

            try {
                const res = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id, pass })
                });
                
                let data;
                try {
                    data = await res.json();
                } catch (parseError) {
                    throw new Error(`Server returned non-JSON response. Status: ${res.status}`);
                }
                
                if (data.success) {
                    loginPanel.style.display = 'none';
                    dashboardPanels.style.display = 'flex';
                    adminContainer.classList.add('dashboard-mode');
                    adminHeaderTitle.textContent = 'Admin Dashboard';
                    logoutBtn.style.display = 'block';
                    loginError.style.display = 'none';
                    renderManageList();
                } else {
                    loginError.textContent = data.error || 'Invalid ID or Password';
                    loginError.style.display = 'block';
                }
            } catch (err) {
                console.error("Login fetch error:", err);
                loginError.textContent = `Error: ${err.message}. Are you running this via Wrangler/Cloudflare?`;
                loginError.style.display = 'block';
            }
        });
    }

    // --- Logout Logic ---
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await fetch('/api/logout', { method: 'POST' });
            } catch (e) {}
            
            document.getElementById('admin-id').value = '';
            document.getElementById('admin-pass').value = '';
            loginPanel.style.display = 'block';
            dashboardPanels.style.display = 'none';
            adminContainer.classList.remove('dashboard-mode');
            adminHeaderTitle.textContent = 'Admin Login';
            logoutBtn.style.display = 'none';
            loginError.style.display = 'none';
        });
    }

    // --- Add Song Logic ---
    const form = document.getElementById('add-song-form');
    const previewArea = document.getElementById('preview-area');
    const previewList = document.getElementById('preview-list');
    const bulkStatus = document.getElementById('bulk-status');
    const submitBtn = document.getElementById('bulk-submit-btn');
    
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const text = document.getElementById('yt-urls').value;
            const defaultArtist = document.getElementById('default-artist').value.trim();
            const lines = text.split('\n').map(l => l.trim()).filter(l => l);
            
            if (lines.length === 0) return;
            
            submitBtn.disabled = true;
            submitBtn.textContent = 'Processing...';
            bulkStatus.style.display = 'block';
            bulkStatus.textContent = `Processing 0 of ${lines.length} links...`;
            
            previewArea.style.display = 'block';
            previewList.innerHTML = '';
            
            let addedCount = 0;
            let addedTracks = [];
            
            for (let i = 0; i < lines.length; i++) {
                const url = lines[i];
                bulkStatus.textContent = `Fetching metadata for link ${i+1} of ${lines.length}...`;
                
                if (url.includes('playlist?list=')) {
                    addPreviewCard(null, url, 'Cannot add full playlists. Please paste individual song links.', 'Skipped');
                    continue;
                }
                
                const videoId = extractYouTubeID(url);
                if (!videoId) {
                    addPreviewCard(null, url, 'Invalid YouTube Link', 'Skipped');
                    continue;
                }
                
                try {
                    const defaultCategoryElement = document.getElementById('default-category');
                    const defaultCategory = defaultCategoryElement ? defaultCategoryElement.value : 'All Songs';
                    
                    // Use noembed to fetch title and author without API key
                    const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
                    const data = await res.json();
                    
                    if (data.error) {
                        addPreviewCard(null, url, 'Video not found or private', 'Skipped');
                        continue;
                    }
                    
                    const title = data.title || 'Unknown Title';
                    const artist = defaultArtist || (data.author_name || 'YouTube');
                    const cover = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
                    
                    const newTrack = {
                        id: videoId,
                        title: title,
                        artist: artist,
                        category: defaultCategory,
                        album: 'YouTube',
                        cover: cover,
                        genre: 'Custom',
                        duration: '0:00' 
                    };
                    
                    addedTracks.push(newTrack);
                    addPreviewCard(cover, title, artist, 'Added!');
                    addedCount++;
                    
                } catch(err) {
                    addPreviewCard(null, url, 'Network Error', 'Skipped');
                }
            }
            if (addedTracks.length > 0) {
                let currentSongs = await loadSongs();
                currentSongs = currentSongs.concat(addedTracks);
                await saveSongs(currentSongs);
            }
            
            bulkStatus.textContent = `Finished! Added ${addedCount} track(s).`;
            submitBtn.disabled = false;
            submitBtn.textContent = 'Auto-Fetch & Add Songs';
            form.reset();
            renderManageList();
        });
    }

    async function loadSongs() {
        try {
            const response = await fetch(`/api/songs`, { cache: 'no-store' });
            if (response.ok) {
                const data = await response.json();
                let cloudSongs = [];
                if (data.result) {
                    cloudSongs = typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
                }
                if (Array.isArray(cloudSongs)) return cloudSongs;
            }
        } catch (e) {
            console.warn("API failed, using local storage");
        }
        return JSON.parse(localStorage.getItem('customSongs')) || [];
    }

    async function saveSongs(songs) {
        localStorage.setItem('customSongs', JSON.stringify(songs)); // Local fallback
        try {
            await fetch(`/api/songs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'same-origin',
                body: JSON.stringify(songs)
            });
        } catch (e) {
            console.warn("Failed to sync to cloud.");
        }
    }

    function addPreviewCard(cover, title, artist, status) {
        const div = document.createElement('div');
        div.className = 'preview-card';
        div.style.background = 'rgba(255,255,255,0.05)';
        div.style.padding = '10px';
        div.style.borderRadius = '8px';
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        div.style.gap = '15px';
        
        let imgHtml = cover ? `<img src="${cover}" alt="Thumb" style="width: 50px; height: 50px; border-radius: 8px; object-fit: cover;">` : `<div style="width:50px;height:50px;background:#444;border-radius:8px;"></div>`;
        
        div.innerHTML = `
            ${imgHtml}
            <div class="preview-details" style="flex: 1; min-width: 0;">
                <h4 style="margin:0;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${title}</h4>
                <p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,0.7);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${artist}</p>
            </div>
            <div style="font-size:12px; font-weight:bold; color: ${status === 'Added!' ? '#00e676' : '#ff5252'}">${status}</div>
        `;
        document.getElementById('preview-list').appendChild(div);
    }

    // --- Manage Songs Logic ---
    
    function showCustomModal(type, title, message, defaultVal1 = '', defaultVal2 = '', defaultVal3 = 'All Songs') {
        return new Promise((resolve) => {
            const overlay = document.getElementById('custom-modal-overlay');
            const titleEl = document.getElementById('modal-title');
            const msgEl = document.getElementById('modal-message');
            const inputs = document.getElementById('modal-inputs');
            const in1 = document.getElementById('modal-input-1');
            const in2 = document.getElementById('modal-input-2');
            const in3 = document.getElementById('modal-input-3');
            const cancelBtn = document.getElementById('modal-cancel-btn');
            const confirmBtn = document.getElementById('modal-confirm-btn');
            
            titleEl.textContent = title;
            msgEl.textContent = message;
            
            if (type === 'prompt') {
                inputs.style.display = 'block';
                msgEl.style.display = 'none';
                in1.value = defaultVal1;
                in2.value = defaultVal2;
                in3.value = defaultVal3;
                confirmBtn.textContent = 'Save';
                confirmBtn.style.background = 'rgba(0, 230, 118, 0.2)';
                confirmBtn.style.color = '#00e676';
                confirmBtn.style.borderColor = 'rgba(0, 230, 118, 0.4)';
            } else {
                inputs.style.display = 'none';
                msgEl.style.display = 'block';
                confirmBtn.textContent = 'Delete';
                confirmBtn.style.background = 'rgba(255, 82, 82, 0.2)';
                confirmBtn.style.color = '#ff5252';
                confirmBtn.style.borderColor = 'rgba(255, 82, 82, 0.4)';
            }
            
            overlay.classList.add('show');
            if (type === 'prompt') in1.focus();
            
            // Cleanup and resolve
            const cleanup = () => {
                overlay.classList.remove('show');
                // Remove listeners by cloning
                cancelBtn.replaceWith(cancelBtn.cloneNode(true));
                confirmBtn.replaceWith(confirmBtn.cloneNode(true));
            };
            
            document.getElementById('modal-cancel-btn').addEventListener('click', () => {
                cleanup();
                resolve(null);
            });
            
            document.getElementById('modal-confirm-btn').addEventListener('click', () => {
                cleanup();
                if (type === 'prompt') {
                    resolve({ 
                        title: document.getElementById('modal-input-1').value, 
                        artist: document.getElementById('modal-input-2').value,
                        category: document.getElementById('modal-input-3').value
                    });
                } else {
                    resolve(true);
                }
            });
        });
    }

    async function renderManageList() {
        const listDiv = document.getElementById('manage-song-list');
        if (!listDiv) return;
        
        listDiv.innerHTML = '<p style="color: rgba(255,255,255,0.5);">Loading from cloud...</p>';
        let customSongs = await loadSongs();
        listDiv.innerHTML = '';
        
        if (customSongs.length === 0) {
            listDiv.innerHTML = '<p style="color: rgba(255,255,255,0.5);">No songs added yet.</p>';
            return;
        }
        
        // Group songs by category
        const grouped = {};
        customSongs.forEach((song, index) => {
            const cat = song.category || 'All Songs';
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push({ song, index });
        });
        
        // Render groups
        Object.keys(grouped).forEach(cat => {
            const groupHeader = document.createElement('div');
            groupHeader.style.display = 'flex';
            groupHeader.style.justifyContent = 'space-between';
            groupHeader.style.alignItems = 'center';
            groupHeader.style.marginTop = '20px';
            groupHeader.style.marginBottom = '10px';
            groupHeader.style.paddingBottom = '5px';
            groupHeader.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
            
            groupHeader.innerHTML = `
                <h3 style="margin:0; font-size: 16px; color: #ff8a65;">${cat}</h3>
                <button class="delete-cat-btn" data-cat="${cat}" style="background: rgba(255, 82, 82, 0.15); color: #ff5252; border: 1px solid rgba(255, 82, 82, 0.3); border-radius: 6px; padding: 4px 10px; cursor: pointer; font-size: 11px;">Delete All in ${cat}</button>
            `;
            listDiv.appendChild(groupHeader);
            
            grouped[cat].forEach(item => {
                const { song, index } = item;
                const div = document.createElement('div');
                div.style.background = 'rgba(255,255,255,0.05)';
                div.style.padding = '10px';
                div.style.borderRadius = '8px';
                div.style.display = 'flex';
                div.style.alignItems = 'center';
                div.style.gap = '15px';
                div.style.marginBottom = '8px';
                
                div.innerHTML = `
                    <img src="${song.cover}" alt="Thumb" style="width: 40px; height: 40px; border-radius: 6px; object-fit: cover;">
                    <div style="flex: 1; overflow: hidden;">
                        <h4 style="margin:0;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${song.title}</h4>
                        <p style="margin:2px 0 0;font-size:11px;color:rgba(255,255,255,0.7);">${song.artist}</p>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="edit-btn" data-index="${index}" style="background: rgba(255, 255, 255, 0.1); color: #fff; border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 6px; padding: 6px 12px; cursor: pointer; font-family: inherit; font-size: 12px; transition: all 0.2s;">Edit</button>
                        <button class="delete-btn" data-index="${index}" style="background: rgba(255, 82, 82, 0.15); color: #ff5252; border: 1px solid rgba(255, 82, 82, 0.3); border-radius: 6px; padding: 6px 12px; cursor: pointer; font-family: inherit; font-size: 12px; transition: all 0.2s;">Delete</button>
                    </div>
                `;
                listDiv.appendChild(div);
            });
        });
        
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.target.getAttribute('data-index'));
                editTrack(idx);
            });
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.target.getAttribute('data-index'));
                deleteTrack(idx);
            });
        });
        
        document.querySelectorAll('.delete-cat-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const cat = e.target.getAttribute('data-cat');
                await deleteCategory(cat);
            });
        });
    }

    async function deleteCategory(catName) {
        let customSongs = await loadSongs();
        const confirmed = await showCustomModal('confirm', 'Delete Entire Category', `Are you sure you want to delete ALL songs in the category "${catName}"?`);
        
        if (confirmed) {
            // Keep songs that DO NOT match the category
            customSongs = customSongs.filter(song => (song.category || 'All Songs') !== catName);
            await saveSongs(customSongs);
            renderManageList();
        }
    }

    async function editTrack(index) {
        let customSongs = await loadSongs();
        let track = customSongs[index];
        
        const result = await showCustomModal('prompt', 'Edit Song Details', '', track.title, track.artist, track.category || 'All Songs');
        if (!result) return;
        
        track.title = result.title.trim() || track.title;
        track.artist = result.artist.trim() || track.artist;
        track.category = (result.category || 'All Songs').trim();
        
        customSongs[index] = track;
        await saveSongs(customSongs);
        renderManageList();
    }

    async function deleteTrack(index) {
        let customSongs = await loadSongs();
        const confirmed = await showCustomModal('confirm', 'Confirm Deletion', `Are you sure you want to delete "${customSongs[index].title}"?`);
        
        if (confirmed) {
            customSongs.splice(index, 1);
            await saveSongs(customSongs);
            renderManageList();
        }
    }
});

function extractYouTubeID(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

function showPreview(track) {
    document.getElementById('preview-thumb').src = track.cover;
    document.getElementById('preview-title').textContent = track.title;
    document.getElementById('preview-artist').textContent = track.artist;
    
    // Handle fallback if maxresdefault doesn't exist
    document.getElementById('preview-thumb').onerror = function() {
        this.src = `https://img.youtube.com/vi/${track.id}/hqdefault.jpg`;
    };
    
    document.getElementById('preview-area').style.display = 'block';
}
