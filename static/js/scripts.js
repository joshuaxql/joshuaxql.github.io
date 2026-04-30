

const content_dir = 'contents/'
const config_file = 'config.yml'
const section_names = ['home', 'publications', 'awards']
const blog_dir = 'contents/blog/'
const blog_index_file = 'posts.json'
const musicManifestPath = 'static/assets/music/tracks.json';
const musicPlayerStorageKey = 'site-music-player-state';
const musicPlayerSessionKey = 'site-music-player-session';

let currentBlogPost = null;
let allBlogPosts = [];  // Store all posts for filtering
let selectedTags = [];  // Selected tags for filtering (multi-select)
let currentSearchQuery = '';  // Current search query
const blogTocSelector = '.blog-post-content h1, .blog-post-content h2, .blog-post-content h3';
const blogTocMinItems = 2;
let blogTocCleanup = null;

function formatMusicTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${minutes}:${secs}`;
}

function readMusicPlayerState(storage, key) {
    try {
        const raw = storage.getItem(key);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function loadMusicPlayerState() {
    const sessionState = readMusicPlayerState(sessionStorage, musicPlayerSessionKey);
    if (sessionState) {
        return {
            ...sessionState,
            restorePlayback: sessionState.wasPlaying === true
        };
    }

    const localState = readMusicPlayerState(localStorage, musicPlayerStorageKey);
    return {
        ...(localState || {}),
        restorePlayback: false
    };
}

function persistMusicPlayerState(state) {
    try {
        const serialized = JSON.stringify(state);
        localStorage.setItem(musicPlayerStorageKey, serialized);
        sessionStorage.setItem(musicPlayerSessionKey, serialized);
    } catch {
        // Ignore storage errors.
    }
}

async function loadMusicTracks() {
    try {
        const response = await fetch(musicManifestPath, { cache: 'no-cache' });
        if (!response.ok) {
            throw new Error(`Failed to load music manifest: ${response.status}`);
        }

        const tracks = await response.json();
        if (!Array.isArray(tracks)) {
            return [];
        }

        return tracks.filter(track =>
            track &&
            typeof track.title === 'string' &&
            typeof track.src === 'string'
        );
    } catch (error) {
        console.error(error);
        return [];
    }
}

async function initMusicPlayer() {
    const musicTracks = await loadMusicTracks();
    if (!musicTracks.length || document.querySelector('.music-player')) return;

    const persistedState = loadMusicPlayerState();
    let trackIndex = Number.isInteger(persistedState.trackIndex) ? persistedState.trackIndex : 0;
    trackIndex = Math.max(0, Math.min(trackIndex, musicTracks.length - 1));
    let pendingTime = Number.isFinite(persistedState.currentTime) ? Math.max(0, persistedState.currentTime) : 0;
    let resumePlayback = persistedState.restorePlayback === true;

    const player = document.createElement('div');
    player.className = 'music-player';
    player.innerHTML = `
        <button type="button" class="music-player-tab" aria-label="显示音乐播放器">
            <i class="bi bi-music-note-beamed" aria-hidden="true"></i>
            <span>MUSIC</span>
        </button>
        <div class="music-player-shell">
            <div class="music-player-head">
                <div class="music-player-badge">
                    <i class="bi bi-music-note-beamed" aria-hidden="true"></i>
                    <span>MUSIC</span>
                </div>
                <div class="music-player-count">${musicTracks.length} tracks</div>
            </div>
            <div class="music-player-meta">
                <div class="music-player-title"></div>
                <div class="music-player-artist"></div>
            </div>
            <div class="music-player-controls">
                <button type="button" class="music-player-btn music-player-btn-secondary" data-action="prev" aria-label="上一首">
                    <i class="bi bi-skip-start-fill" aria-hidden="true"></i>
                </button>
                <button type="button" class="music-player-btn music-player-btn-primary" data-action="toggle" aria-label="播放">
                    <i class="bi bi-play-fill" aria-hidden="true"></i>
                </button>
                <button type="button" class="music-player-btn music-player-btn-secondary" data-action="next" aria-label="下一首">
                    <i class="bi bi-skip-end-fill" aria-hidden="true"></i>
                </button>
            </div>
            <div class="music-player-progress">
                <span class="music-player-time music-player-time-current">0:00</span>
                <input class="music-player-slider" type="range" min="0" max="1000" value="0" step="1" aria-label="播放进度" />
                <span class="music-player-time music-player-time-duration">0:00</span>
            </div>
        </div>
    `;
    document.body.appendChild(player);

    const audio = new Audio();
    audio.preload = 'metadata';
    audio.crossOrigin = 'anonymous';

    const titleEl = player.querySelector('.music-player-title');
    const artistEl = player.querySelector('.music-player-artist');
    const countEl = player.querySelector('.music-player-count');
    const playButton = player.querySelector('[data-action="toggle"]');
    const prevButton = player.querySelector('[data-action="prev"]');
    const nextButton = player.querySelector('[data-action="next"]');
    const progressInput = player.querySelector('.music-player-slider');
    const currentTimeEl = player.querySelector('.music-player-time-current');
    const durationEl = player.querySelector('.music-player-time-duration');
    const navbarBrand = document.getElementById('page-top-title');

    let audioContext = null;
    let analyserNode = null;
    let mediaSourceNode = null;
    let frequencyData = null;
    let visualizerFrame = null;
    let navVisualizerCanvas = null;
    let navVisualizerContext = null;
    let navVisualizerWidth = 0;
    let navVisualizerHeight = 0;
    const navVisualizerBarCount = 14;
    let navVisualizerLevels = Array.from({ length: navVisualizerBarCount }, () => 0.18);

    if (navbarBrand && !document.querySelector('.navbar-audio-visualizer')) {
        const navVisualizer = document.createElement('div');
        navVisualizer.className = 'navbar-audio-visualizer';
        navVisualizer.innerHTML = '<canvas class="navbar-audio-visualizer-canvas" aria-hidden="true"></canvas>';
        navbarBrand.insertAdjacentElement('afterend', navVisualizer);
        navVisualizerCanvas = navVisualizer.querySelector('.navbar-audio-visualizer-canvas');
        navVisualizerContext = navVisualizerCanvas.getContext('2d');
    }

    const syncNavbarVisualizerSize = () => {
        if (!navVisualizerCanvas || !navVisualizerContext) return;
        const rect = navVisualizerCanvas.getBoundingClientRect();
        navVisualizerWidth = Math.max(1, rect.width);
        navVisualizerHeight = Math.max(1, rect.height);
        const dpr = window.devicePixelRatio || 1;
        const pixelWidth = Math.max(1, Math.round(navVisualizerWidth * dpr));
        const pixelHeight = Math.max(1, Math.round(navVisualizerHeight * dpr));

        if (navVisualizerCanvas.width !== pixelWidth || navVisualizerCanvas.height !== pixelHeight) {
            navVisualizerCanvas.width = pixelWidth;
            navVisualizerCanvas.height = pixelHeight;
            navVisualizerContext.setTransform(dpr, 0, 0, dpr, 0, 0);
        }
    };

    const ensureAudioGraph = async () => {
        const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextCtor) return;

        if (!audioContext) {
            audioContext = new AudioContextCtor();
            analyserNode = audioContext.createAnalyser();
            analyserNode.fftSize = 128;
            analyserNode.smoothingTimeConstant = 0.82;
            mediaSourceNode = audioContext.createMediaElementSource(audio);
            mediaSourceNode.connect(analyserNode);
            analyserNode.connect(audioContext.destination);
            frequencyData = new Uint8Array(analyserNode.frequencyBinCount);
        }

        if (audioContext.state === 'suspended') {
            try {
                await audioContext.resume();
            } catch {
                // Ignore resume failures; playback promise will reflect user-gesture restrictions.
            }
        }
    };

    const stopNavbarVisualizer = () => {
        if (visualizerFrame) {
            window.cancelAnimationFrame(visualizerFrame);
            visualizerFrame = null;
        }
    };

    const drawNavbarVisualizer = () => {
        if (!navVisualizerContext || !navVisualizerCanvas) return;

        syncNavbarVisualizerSize();
        navVisualizerContext.clearRect(0, 0, navVisualizerWidth, navVisualizerHeight);

        const accent = getComputedStyle(document.documentElement).getPropertyValue('--h-title-color').trim() || '#F78E62';
        const gap = 2;
        const barWidth = Math.max(2, (navVisualizerWidth - gap * (navVisualizerBarCount - 1)) / navVisualizerBarCount);
        const maxBarHeight = Math.max(4, navVisualizerHeight - 2);
        const active = analyserNode && frequencyData && !audio.paused && !audio.ended;

        if (active) {
            analyserNode.getByteFrequencyData(frequencyData);
            navVisualizerLevels = Array.from({ length: navVisualizerBarCount }, (_, index) => {
                const sampleIndex = Math.min(
                    frequencyData.length - 1,
                    Math.floor(index / navVisualizerBarCount * frequencyData.length)
                );
                return frequencyData[sampleIndex] / 255;
            });
        }

        for (let index = 0; index < navVisualizerBarCount; index += 1) {
            const amplitude = navVisualizerLevels[index] ?? 0.18;
            const barHeight = Math.max(2, amplitude * maxBarHeight);
            const x = index * (barWidth + gap);
            const y = navVisualizerHeight - barHeight;

            navVisualizerContext.fillStyle = accent;
            navVisualizerContext.globalAlpha = active ? 0.96 : 0.28;
            navVisualizerContext.fillRect(x, y, barWidth, barHeight);
        }

        navVisualizerContext.globalAlpha = 1;
        if (active) {
            visualizerFrame = window.requestAnimationFrame(drawNavbarVisualizer);
        } else {
            visualizerFrame = null;
        }
    };

    const startNavbarVisualizer = () => {
        if (!navVisualizerContext || visualizerFrame) return;
        drawNavbarVisualizer();
    };

    const saveState = () => {
        persistMusicPlayerState({
            trackIndex,
            currentTime: audio.currentTime || pendingTime || 0,
            wasPlaying: (!audio.paused && !audio.ended) || resumePlayback
        });
    };

    const updatePlayButton = () => {
        const isPaused = audio.paused;
        playButton.innerHTML = isPaused
            ? '<i class="bi bi-play-fill" aria-hidden="true"></i>'
            : '<i class="bi bi-pause-fill" aria-hidden="true"></i>';
        playButton.setAttribute('aria-label', isPaused ? '播放' : '暂停');
    };

    const updateProgress = () => {
        const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
        currentTimeEl.textContent = formatMusicTime(audio.currentTime);
        durationEl.textContent = formatMusicTime(duration);
        progressInput.value = duration > 0 ? String(Math.round((audio.currentTime / duration) * 1000)) : '0';
    };

    const attemptPlay = () => {
        const playPromise = ensureAudioGraph().then(() => audio.play());
        if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(() => {
                updatePlayButton();
                saveState();
            });
        }
    };

    const setTrack = (nextIndex, options = {}) => {
        const { resumeTime = 0, autoplay = false } = options;
        trackIndex = (nextIndex + musicTracks.length) % musicTracks.length;
        const track = musicTracks[trackIndex];
        pendingTime = Math.max(0, resumeTime);
        resumePlayback = autoplay;

        titleEl.textContent = track.title;
        artistEl.textContent = track.artist;
        countEl.textContent = `${trackIndex + 1} / ${musicTracks.length}`;
        currentTimeEl.textContent = '0:00';
        durationEl.textContent = '0:00';
        progressInput.value = '0';

        audio.src = encodeURI(track.src);
        audio.load();
        updatePlayButton();
        saveState();
    };

    playButton.addEventListener('click', () => {
        if (audio.paused) {
            resumePlayback = true;
            attemptPlay();
        } else {
            resumePlayback = false;
            audio.pause();
        }
    });

    prevButton.addEventListener('click', () => {
        const shouldAutoplay = !audio.paused;
        setTrack(trackIndex - 1, { autoplay: shouldAutoplay });
    });

    nextButton.addEventListener('click', () => {
        const shouldAutoplay = !audio.paused;
        setTrack(trackIndex + 1, { autoplay: shouldAutoplay });
    });

    progressInput.addEventListener('input', () => {
        if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
        audio.currentTime = (Number(progressInput.value) / 1000) * audio.duration;
        updateProgress();
        saveState();
    });

    audio.addEventListener('loadedmetadata', () => {
        if (pendingTime > 0) {
            audio.currentTime = Math.min(pendingTime, Math.max(0, (audio.duration || pendingTime) - 0.25));
            pendingTime = 0;
        }
        updateProgress();
        if (resumePlayback) {
            attemptPlay();
        }
    });

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('play', () => {
        updatePlayButton();
        startNavbarVisualizer();
        saveState();
    });
    audio.addEventListener('pause', () => {
        updatePlayButton();
        stopNavbarVisualizer();
        drawNavbarVisualizer();
        saveState();
    });
    audio.addEventListener('ended', () => {
        setTrack(trackIndex + 1, { autoplay: true });
    });

    window.addEventListener('beforeunload', saveState);
    window.addEventListener('pagehide', () => {
        saveState();
        stopNavbarVisualizer();
    });
    window.addEventListener('resize', () => {
        syncNavbarVisualizerSize();
        if (!visualizerFrame) {
            drawNavbarVisualizer();
        }
    });

    setTrack(trackIndex, {
        resumeTime: pendingTime,
        autoplay: resumePlayback
    });

    if (navVisualizerContext) {
        drawNavbarVisualizer();
    }
}

function configureMarkdownRenderer() {
    if (typeof marked === 'undefined') return false;

    marked.use({
        mangle: false,
        headerIds: false,
        highlight: function (code, lang) {
            if (lang && typeof Prism !== 'undefined' && Prism.languages[lang]) {
                try {
                    return Prism.highlight(code, Prism.languages[lang], lang);
                } catch (e) {
                    console.error('Prism highlight error:', e);
                }
            }
            return code;
        }
    });

    return true;
}

function initMarkdownSections() {
    if (!configureMarkdownRenderer()) return;

    section_names.forEach((name) => {
        const container = document.getElementById(name + '-md');
        if (!container) return;

        fetch(content_dir + name + '.md')
            .then(response => response.text())
            .then(markdown => {
                const html = marked.parse(markdown);
                container.innerHTML = html;
            }).then(() => {
                if (window.MathJax && typeof MathJax.typeset === 'function') {
                    MathJax.typeset();
                }
                if (typeof Prism !== 'undefined') {
                    Prism.highlightAllUnder(container);
                }
                addCopyButtons(container);
            })
            .catch(error => console.log(error));
    });
}

// Add copy buttons to all <pre> blocks within a container
function addCopyButtons(container) {
    const preBlocks = container.querySelectorAll('pre');
    preBlocks.forEach(pre => {
        // Skip if already wrapped
        if (pre.parentElement.classList.contains('code-block-wrapper')) return;

        const btn = document.createElement('button');
        btn.className = 'code-copy-btn';
        btn.textContent = '复制';
        btn.addEventListener('click', async () => {
            const code = pre.querySelector('code');
            const text = code ? code.textContent : pre.textContent;
            try {
                await navigator.clipboard.writeText(text);
                btn.textContent = '已复制!';
                btn.classList.add('copied');
                setTimeout(() => {
                    btn.textContent = '复制';
                    btn.classList.remove('copied');
                }, 2000);
            } catch (err) {
                // Fallback for older browsers
                const textarea = document.createElement('textarea');
                textarea.value = text;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                btn.textContent = '已复制!';
                btn.classList.add('copied');
                setTimeout(() => {
                    btn.textContent = '复制';
                    btn.classList.remove('copied');
                }, 2000);
            }
        });

        // Wrap <pre> in a div so the copy button stays fixed at top-right
        const wrapper = document.createElement('div');
        wrapper.className = 'code-block-wrapper';
        pre.parentNode.insertBefore(wrapper, pre);
        wrapper.appendChild(btn);
        wrapper.appendChild(pre);
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function cleanupBlogPostToc() {
    if (typeof blogTocCleanup === 'function') {
        blogTocCleanup();
    }
    blogTocCleanup = null;
}

function initBlogPostToc(container) {
    cleanupBlogPostToc();

    const layout = container.querySelector('.blog-post-layout');
    const tocContainer = container.querySelector('.blog-post-toc');
    const tocAside = container.querySelector('.blog-post-aside');
    if (!layout || !tocContainer || !tocAside) return;

    const headings = Array.from(container.querySelectorAll(blogTocSelector))
        .map((heading, index) => {
            const text = heading.textContent.replace(/\s+/g, ' ').trim();
            if (!text) return null;

            const id = `blog-heading-${index + 1}`;
            heading.id = id;

            return {
                id,
                text,
                depth: Number(heading.tagName.slice(1)),
                element: heading
            };
        })
        .filter(Boolean);

    if (headings.length < blogTocMinItems) {
        layout.classList.add('blog-post-layout--single');
        const tocAside = tocContainer.closest('.blog-post-aside');
        if (tocAside) {
            tocAside.remove();
        }
        return;
    }

    layout.classList.remove('blog-post-layout--single');
    tocContainer.innerHTML = `
        <div class="blog-toc-title">目录</div>
        <div class="blog-toc-list" role="navigation" aria-label="文章目录">
            ${headings.map(heading => `
                <button type="button" class="blog-toc-link toc-depth-${heading.depth}" data-target="${heading.id}">
                    <span class="blog-toc-marker" aria-hidden="true"></span>
                    <span class="blog-toc-text">${escapeHtml(heading.text)}</span>
                </button>
            `).join('')}
        </div>
    `;

    const links = Array.from(tocContainer.querySelectorAll('.blog-toc-link'));
    const linkMap = new Map(links.map(link => [link.dataset.target, link]));
    const activeThreshold = 140;

    links.forEach(link => {
        link.addEventListener('click', () => {
            const target = document.getElementById(link.dataset.target);
            if (!target) return;
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });

    const syncActiveLink = () => {
        let activeId = headings[0].id;

        headings.forEach(heading => {
            if (heading.element.getBoundingClientRect().top <= activeThreshold) {
                activeId = heading.id;
            }
        });

        linkMap.forEach((link, id) => {
            const isActive = id === activeId;
            link.classList.toggle('active', isActive);
            link.setAttribute('aria-current', isActive ? 'true' : 'false');
        });
    };

    const handleScroll = () => {
        syncActiveLink();
    };

    syncActiveLink();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', syncActiveLink);

    blogTocCleanup = () => {
        window.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', syncActiveLink);
    };
}


// Apply saved theme immediately to avoid flash
(function () {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
})();

function initThemeToggle() {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    const icon = btn.querySelector('i');
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    icon.className = isDark ? 'bi bi-sun-fill' : 'bi bi-moon-fill';

    btn.addEventListener('click', () => {
        btn.classList.add('spin');
        setTimeout(() => btn.classList.remove('spin'), 500);
        const dark = document.documentElement.getAttribute('data-theme') === 'dark';
        if (dark) {
            document.documentElement.removeAttribute('data-theme');
            icon.className = 'bi bi-moon-fill';
            localStorage.setItem('theme', 'light');
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            icon.className = 'bi bi-sun-fill';
            localStorage.setItem('theme', 'dark');
        }
    });
}

function initScrollEffects() {
    const progressBar = document.getElementById('scroll-progress');
    const navbar = document.getElementById('mainNav');
    const hero = document.querySelector('.top-section, .blog-top-section');

    window.addEventListener('scroll', () => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        if (progressBar && docHeight > 0) {
            progressBar.style.width = (scrollTop / docHeight * 100) + '%';
        }
        if (navbar) {
            navbar.classList.toggle('navbar-compact', scrollTop > 80);
        }
        if (hero) {
            hero.style.setProperty('--parallax-y', (scrollTop * 0.3) + 'px');
        }
    }, { passive: true });
}

function initRevealAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12 });

    document.querySelectorAll('section').forEach(section => {
        section.classList.add('reveal');
        observer.observe(section);
    });

    document.querySelectorAll('section header h2').forEach(h2 => {
        h2.classList.add('reveal-header');
        observer.observe(h2);
    });
}

let oml2dInstance = null;

function getLive2dModel() {
    return {
        path: 'https://model.hacxy.cn/cat-white/model.json',
        scale: 0.15,
        position: [0, 20],
        stageStyle: { height: 350 }
    };
}

function reloadLive2d() {
    if (!oml2dInstance || typeof OML2D === 'undefined' || !document.getElementById('blog-list')) return;
    oml2dInstance.destroy();
    oml2dInstance = OML2D.loadOml2d({
        dockedPosition: 'right',
        primaryColor: getComputedStyle(document.documentElement).getPropertyValue('--h-title-color').trim(),
        mobileDisplay: false,
        models: [getLive2dModel()]
    });
}

function initLive2d() {
    if (typeof OML2D === 'undefined' || !document.getElementById('blog-list')) return;
    oml2dInstance = OML2D.loadOml2d({
        dockedPosition: 'right',
        primaryColor: getComputedStyle(document.documentElement).getPropertyValue('--h-title-color').trim(),
        mobileDisplay: false,
        models: [getLive2dModel()]
    });
}

window.addEventListener('DOMContentLoaded', event => {

    initThemeToggle();
    initScrollEffects();
    initMusicPlayer();
    initLive2d();
    initRevealAnimations();

    // Activate Bootstrap scrollspy on the main nav element
    const mainNav = document.body.querySelector('#mainNav');
    if (mainNav) {
        new bootstrap.ScrollSpy(document.body, {
            target: '#mainNav',
            offset: 74,
        });
    };

    // Collapse responsive navbar when toggler is visible
    const navbarToggler = document.body.querySelector('.navbar-toggler');
    const responsiveNavItems = [].slice.call(
        document.querySelectorAll('#navbarResponsive .nav-link')
    );
    responsiveNavItems.map(function (responsiveNavItem) {
        responsiveNavItem.addEventListener('click', () => {
            if (window.getComputedStyle(navbarToggler).display !== 'none') {
                navbarToggler.click();
            }
        });
    });


    // Yaml
    fetch(content_dir + config_file)
        .then(response => response.text())
        .then(text => {
            const yml = jsyaml.load(text);
            Object.keys(yml).forEach(key => {
                const target = document.getElementById(key);
                if (target) {
                    target.innerHTML = yml[key];
                }
            });
        })
        .catch(error => console.log(error));


    initMarkdownSections();

    // Blog - only load if blog-list element exists
    if (document.getElementById('blog-list')) {
        loadBlogList();

        // Bind search input
        const searchInput = document.getElementById('blog-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                currentSearchQuery = e.target.value;
                filterAndRenderPosts();
            });
        }
    }

});


// Blog functions
async function loadBlogList() {
    try {
        const response = await fetch(blog_dir + blog_index_file);
        if (!response.ok) throw new Error('posts.json not found');
        const posts = await response.json();

        // Sort by date descending, then by title ascending
        posts.sort((a, b) => {
            const dateCompare = new Date(b.date) - new Date(a.date);
            if (dateCompare !== 0) return dateCompare;
            return (a.title || '').localeCompare(b.title || '', 'zh');
        });

        allBlogPosts = posts;
        renderTagFilter(posts);
        renderBlogList(posts);
    } catch (error) {
        console.error('Failed to load blog posts:', error);
    }
}

function parseFrontMatter(text) {
    const match = text.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);
    if (!match) return {};

    const yaml = match[1];
    const result = {};

    // Parse title
    const titleMatch = yaml.match(/title:\s*["']?(.*?)["']?\s*$/m);
    if (titleMatch) result.title = titleMatch[1];

    // Parse date
    const dateMatch = yaml.match(/date:\s*["']?(.*?)["']?\s*$/m);
    if (dateMatch) result.date = dateMatch[1];

    // Parse summary
    const summaryMatch = yaml.match(/summary:\s*["']?(.*?)["']?\s*$/m);
    if (summaryMatch) result.summary = summaryMatch[1];

    // Parse tags (array)
    const tagsMatch = yaml.match(/tags:\s*\n((?:\s*-\s*.*\n)*)/);
    if (tagsMatch) {
        result.tags = tagsMatch[1].split('\n')
            .map(line => line.replace(/^\s*-\s*/, '').replace(/["']/g, '').trim())
            .filter(t => t);
    }

    return result;
}

function renderTagFilter(posts) {
    // Collect all unique tags
    const tags = new Set();
    posts.forEach(post => {
        if (post.tags) {
            post.tags.forEach(tag => tags.add(tag));
        }
    });

    const tagsContainer = document.getElementById('blog-tags');
    if (tags.size === 0) {
        tagsContainer.innerHTML = '';
        return;
    }

    let html = '<div class="tag-filter">';
    html += `<span class="tag-label">Tags:</span> `;
    html += `<button class="tag-btn tag-btn-all ${selectedTags.length === 0 ? 'active' : ''}" onclick="clearAllTags()">All</button>`;

    Array.from(tags).sort().forEach(tag => {
        const isSelected = selectedTags.includes(tag);
        html += `<button class="tag-btn ${isSelected ? 'active' : ''}" onclick="toggleTag('${tag}')">${tag}</button>`;
    });

    html += '</div>';
    tagsContainer.innerHTML = html;
}

function toggleTag(tag) {
    const index = selectedTags.indexOf(tag);
    if (index === -1) {
        selectedTags.push(tag);
    } else {
        selectedTags.splice(index, 1);
    }
    filterAndRenderPosts();
    renderTagFilter(allBlogPosts);
}

function clearAllTags() {
    selectedTags = [];
    filterAndRenderPosts();
    renderTagFilter(allBlogPosts);
}

function filterAndRenderPosts() {
    let filtered = allBlogPosts;

    // Filter by tags (multi-select: OR logic - match any selected tag)
    if (selectedTags.length > 0) {
        filtered = filtered.filter(post => post.tags && selectedTags.some(tag => post.tags.includes(tag)));
    }

    // Filter by search query
    if (currentSearchQuery) {
        const query = currentSearchQuery.toLowerCase();
        filtered = filtered.filter(post =>
            post.title.toLowerCase().includes(query) ||
            (post.summary && post.summary.toLowerCase().includes(query)) ||
            (post.tags && post.tags.some(t => t.toLowerCase().includes(query)))
        );
    }

    renderBlogList(filtered, true);

    // Update search info
    const searchInfo = document.getElementById('blog-search-info');
    if (selectedTags.length > 0 || currentSearchQuery) {
        searchInfo.style.display = 'block';
        let infoText = '';
        if (selectedTags.length > 0) infoText += `Tags: ${selectedTags.join(', ')}`;
        if (currentSearchQuery) {
            if (infoText) infoText += ' | ';
            infoText += `Search: "${currentSearchQuery}"`;
        }
        infoText += ` (${filtered.length} result${filtered.length !== 1 ? 's' : ''})`;
        searchInfo.innerHTML = `<span class="text-muted">${infoText}</span>`;
    } else {
        searchInfo.style.display = 'none';
    }
}

function renderBlogList(posts, isFiltered = false) {
    const container = document.getElementById('blog-list');

    if (posts.length === 0) {
        container.innerHTML = '<p class="text-muted">No articles found.</p>';
        return;
    }

    let html = '<div class="blog-list">';

    posts.forEach((post, idx) => {
        html += `
        <article class="blog-item mb-4 p-4 border rounded blog-item-stagger" style="animation-delay:${idx * 0.08}s">
            <h3 class="blog-item-title">
                <a href="#" onclick="loadBlogPost('${post.slug}'); return false;">${post.title}</a>
            </h3>
            <div class="blog-item-meta text-muted">
                <span class="blog-item-date"><i class="bi bi-calendar"></i> ${post.date}</span>
                ${post.tags ? `<span class="blog-item-tags"><i class="bi bi-tags"></i> ${post.tags.map(t => `<span class="tag-chip" onclick="toggleTag('${t}'); return false;">${t}</span>`).join(', ')}</span>` : ''}
            </div>
            <p class="blog-item-summary mt-2">${post.summary}</p>
        </article>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}

async function loadBlogPost(slug) {
    const blogListContainer = document.getElementById('blog-list');
    const blogPostContainer = document.getElementById('blog-post');

    currentBlogPost = slug;
    const encodedSlug = encodeURIComponent(slug);
    cleanupBlogPostToc();

    blogListContainer.style.display = 'none';
    blogPostContainer.style.display = 'block';
    blogPostContainer.classList.remove('blog-post-enter');
    void blogPostContainer.offsetWidth;
    blogPostContainer.classList.add('blog-post-enter');

    document.getElementById('blog').scrollIntoView({ behavior: 'smooth' });

    try {
        const response = await fetch(blog_dir + encodedSlug + '/index.md');
        if (!response.ok) throw new Error('Article not found.');

        const markdown = await response.text();
        const content = markdown.replace(/^---\s*\r?\n[\s\S]*?\r?\n---\s*\r?\n?/, '');
        const html = marked.parse(content);
        blogPostContainer.innerHTML = `
            <div class="blog-post-layout blog-post-layout--single">
                <article class="blog-post">
                    <div class="blog-post-header mb-4">
                        <a href="#" onclick="backToBlogList(); return false;" class="blog-back-link">
                            <i class="bi bi-arrow-left"></i> Back to Blog
                        </a>
                    </div>
                    <div class="blog-post-content">${html}</div>
                </article>
                <aside class="blog-post-aside" aria-label="文章目录">
                    <div class="blog-post-toc"></div>
                </aside>
            </div>
        `;

        if (window.MathJax && typeof MathJax.typesetPromise === 'function') {
            await MathJax.typesetPromise([blogPostContainer]);
        }

        if (typeof Prism !== 'undefined') {
            Prism.highlightAllUnder(blogPostContainer);
        }

        addCopyButtons(blogPostContainer);
        initBlogPostToc(blogPostContainer);
    } catch (error) {
        cleanupBlogPostToc();
        blogPostContainer.innerHTML = '<p>Article not found.</p>';
        console.error(error);
    }
}

function backToBlogList() {
    currentBlogPost = null;
    selectedTags = [];
    currentSearchQuery = '';
    cleanupBlogPostToc();
    document.getElementById('blog-list').style.display = 'block';
    document.getElementById('blog-post').style.display = 'none';
    document.getElementById('blog-search-input').value = '';
    document.getElementById('blog-search-info').style.display = 'none';
    renderTagFilter(allBlogPosts);
    renderBlogList(allBlogPosts);
} 
