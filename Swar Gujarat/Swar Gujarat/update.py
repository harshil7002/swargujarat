import re

with open('css/responsive.css', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = re.compile(r'    /\* ============================\n       MOBILE PLAYER - TWO GLASS CARDS\n       ============================ \*/.*?    /\* ============================\n', re.DOTALL)

new_content = '''    /* ============================
       MOBILE PLAYER - SPOTIFY WIDGET STYLE
       ============================ */
    
    .pill-player {
        bottom: 20px;
        left: 5%;
        width: 90%;
        max-width: none;
        border-radius: 16px;
        padding: 16px;
        background: #1a1a1a !important;
        border: none !important;
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
        box-shadow: 0 10px 30px rgba(0,0,0,0.6) !important;
        transform: translateX(0);
        animation: none;
        opacity: 1;
    }

    .pill-player-inner {
        display: grid !important;
        grid-template-columns: 80px 1fr;
        grid-template-rows: auto auto;
        gap: 8px 16px;
        align-items: center;
    }

    .cd-container {
        grid-column: 1;
        grid-row: 1 / 3;
        width: 80px;
        height: 80px;
        margin: 0;
        border-radius: 8px;
        overflow: hidden;
        background: #333;
    }

    .player-cover {
        width: 100%;
        height: 100%;
        border-radius: 8px;
        object-fit: cover;
    }

    .cd-hole {
        display: none !important;
    }

    .pill-track-info {
        grid-column: 2;
        grid-row: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
        background: transparent;
        border: none;
        padding: 0;
        box-shadow: none;
        backdrop-filter: none;
        -webkit-backdrop-filter: none;
    }

    .pill-track-info h3 {
        font-size: 16px;
        font-weight: 700;
        color: #fff;
        margin-bottom: 2px;
        padding-top: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .pill-track-info p {
        font-size: 13px;
        color: #b3b3b3;
        margin-bottom: 12px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .pill-progress-container {
        width: 100%;
    }

    .progress-bar-bg {
        height: 4px;
        border-radius: 2px;
        background: #4f4f4f;
    }

    .progress-bar-fill {
        background: #fff;
    }

    .pill-time {
        display: flex;
        justify-content: space-between;
        width: 100%;
        font-size: 10px;
        color: #b3b3b3;
        margin-top: 6px;
        margin-bottom: 0;
    }

    .pill-controls {
        grid-column: 2;
        grid-row: 2;
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 24px;
        background: transparent;
        border: none;
        padding: 0;
        margin-top: 0;
        box-shadow: none;
        backdrop-filter: none;
        -webkit-backdrop-filter: none;
    }

    .control-btn {
        width: 36px;
        height: 36px;
        background: transparent;
        border: none;
        color: #fff;
    }
    
    .control-btn:hover {
        transform: none;
        background: transparent;
    }

    .pill-play-btn {
        width: 48px !important;
        height: 48px !important;
        background: #fff !important;
        border: none !important;
        border-radius: 50% !important;
        color: #000;
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .pill-play-btn svg {
        color: #000;
        fill: #000;
        width: 24px;
        height: 24px;
    }

    .pill-play-btn:hover {
        background: #e0e0e0 !important;
        transform: none;
        box-shadow: none;
    }

    .volume-icon, .volume-bar-bg, .player-extras {
        display: none !important;
    }

    /* ============================
'''

content = pattern.sub(new_content, content)

with open('css/responsive.css', 'w', encoding='utf-8') as f:
    f.write(content)

print("done")
