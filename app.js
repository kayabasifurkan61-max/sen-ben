/**
 * Sude & Furkan - Aşk Zaman Sayacı & Fotoğraf Albümü
 * Core JavaScript Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // Core Configuration
    const START_DATE = new Date(2026, 5, 17, 23, 18, 0); // 17 June 2026, 23:18 (Months are 0-indexed: 5 = June)

    // DOM Elements
    const elements = {
        years: document.getElementById('val-years'),
        months: document.getElementById('val-months'),
        days: document.getElementById('val-days'),
        hours: document.getElementById('val-hours'),
        minutes: document.getElementById('val-minutes'),
        seconds: document.getElementById('val-seconds'),
        themeToggle: document.getElementById('themeToggle'),
        photoUpload: document.getElementById('photoUpload'),
        galleryGrid: document.getElementById('galleryGrid'),
        emptyState: document.getElementById('emptyState'),
        lightbox: document.getElementById('lightbox'),
        lightboxImg: document.getElementById('lightboxImg'),
        lightboxCaption: document.getElementById('lightboxCaption'),
        lightboxClose: document.getElementById('lightboxClose'),
        lightboxPrev: document.getElementById('lightboxPrev'),
        lightboxNext: document.getElementById('lightboxNext'),
        canvas: document.getElementById('heartCanvas'),
        // Audio elements
        vinylContainer: document.getElementById('vinylContainer'),
        trackTitle: document.getElementById('trackTitle'),
        trackArtist: document.getElementById('trackArtist'),
        currentTime: document.getElementById('currentTime'),
        progressBar: document.getElementById('progressBar'),
        totalTime: document.getElementById('totalTime'),
        btnPrev: document.getElementById('btnPrev'),
        btnPlayPause: document.getElementById('btnPlayPause'),
        btnNext: document.getElementById('btnNext'),
        btnPlaylist: document.getElementById('btnPlaylist'),
        playlistDrawer: document.getElementById('playlistDrawer'),
        songUpload: document.getElementById('songUpload'),
        playlistItems: document.getElementById('playlistItems'),
        audio: document.getElementById('mainAudio'),
        // Password elements
        passwordScreen: document.getElementById('passwordScreen'),
        passwordCard: document.getElementById('passwordCard'),
        passwordInput: document.getElementById('passwordInput'),
        btnSubmitPassword: document.getElementById('btnSubmitPassword'),
        passwordError: document.getElementById('passwordError')
    };

    // State Variables
    let db = null;
    let photosList = [];
    let currentLightboxIndex = -1;
    let touchStartX = 0;
    let touchEndX = 0;
    
    // Auth State
    const VALID_PASSWORDS = ["17.06.2026", "17062026", "1706"];
    let isAppInitialized = false;

    // Music Player State Variables
    const DEFAULT_SONGS = [
        { id: 'def-1', title: "Canım", url: "canim.mp3", isDefault: true },
        { id: 'def-2', title: "Ey Deli Aşk", url: "Ey Deli Aşk.mp3", isDefault: true },
        { id: 'def-3', title: "Madrigal - Seni Dert Etmeler", url: "Madrigal - Seni Dert Etmeler.m4a", isDefault: true },
        { id: 'def-4', title: "Ozan Manas - Gökçe Kız", url: "Ozan Manas - Gökçe Kız.m4a", isDefault: true },
        { id: 'def-5', title: "Sezen Aksu - Ey Aşk", url: "Sezen Aksu - Ey Aşk.m4a", isDefault: true },
        { id: 'def-6', title: "Sevdugumm", url: "sevdugumm.m4a", isDefault: true }
    ];
    let customSongsList = [];
    let playlist = [];
    let currentSongIndex = 0;
    let isPlaying = false;

    // --- 1. THEME MANAGEMENT ---
    function initTheme() {
        const savedTheme = localStorage.getItem('theme');
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
        
        document.documentElement.setAttribute('data-theme', initialTheme);
        updateMetaThemeColor(initialTheme);
    }

    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateMetaThemeColor(newTheme);
    }

    function updateMetaThemeColor(theme) {
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.setAttribute('content', theme === 'dark' ? '#181416' : '#FFB3C1');
        }
    }

    elements.themeToggle.addEventListener('click', toggleTheme);
    initTheme();


    // --- 2. LIVE TIME COUNTER ---
    function formatNumber(num) {
        return num.toString().padStart(2, '0');
    }

    function updateCounter() {
        const now = new Date();
        
        // If current time is somehow before the relationship start date, display zeros
        if (now < START_DATE) {
            elements.years.textContent = '00';
            elements.months.textContent = '00';
            elements.days.textContent = '00';
            elements.hours.textContent = '00';
            elements.minutes.textContent = '00';
            elements.seconds.textContent = '00';
            return;
        }

        // Calendar-accurate duration calculation
        let years = now.getFullYear() - START_DATE.getFullYear();
        let months = now.getMonth() - START_DATE.getMonth();
        let days = now.getDate() - START_DATE.getDate();
        let hours = now.getHours() - START_DATE.getHours();
        let minutes = now.getMinutes() - START_DATE.getMinutes();
        let seconds = now.getSeconds() - START_DATE.getSeconds();

        // Adjust seconds
        if (seconds < 0) {
            seconds += 60;
            minutes--;
        }
        // Adjust minutes
        if (minutes < 0) {
            minutes += 60;
            hours--;
        }
        // Adjust hours
        if (hours < 0) {
            hours += 24;
            days--;
        }
        // Adjust days
        if (days < 0) {
            // Find length of previous month relative to current calculation
            const prevMonthDate = new Date(now.getFullYear(), now.getMonth(), 0);
            days += prevMonthDate.getDate();
            months--;
        }
        // Adjust months
        if (months < 0) {
            months += 12;
            years--;
        }

        // Render values
        elements.years.textContent = formatNumber(years);
        elements.months.textContent = formatNumber(months);
        elements.days.textContent = formatNumber(days);
        elements.hours.textContent = formatNumber(hours);
        elements.minutes.textContent = formatNumber(minutes);
        elements.seconds.textContent = formatNumber(seconds);
    }

    // Run immediately and then start interval
    updateCounter();
    setInterval(updateCounter, 1000);


    // --- 3. INDEXEDDB PERSISTENCE ---
    const DB_NAME = 'SudeFurkanLoveGallery';
    const DB_VERSION = 2; // Bump version to upgrade schema
    const STORE_NAME = 'photos';

    function initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = (e) => {
                console.error("IndexedDB load error:", e);
                reject("Veritabanı açılamadı.");
            };

            request.onsuccess = (e) => {
                db = e.target.result;
                resolve(db);
            };

            request.onupgradeneeded = (e) => {
                const database = e.target.result;
                if (!database.objectStoreNames.contains(STORE_NAME)) {
                    database.createObjectStore(STORE_NAME, { keyPath: 'id' });
                }
                if (!database.objectStoreNames.contains('songs')) {
                    database.createObjectStore('songs', { keyPath: 'id' });
                }
            };
        });
    }

    function getAllSongsFromDB() {
        return new Promise((resolve, reject) => {
            if (!db) return reject("Database not initialized");
            
            const transaction = db.transaction(['songs'], 'readonly');
            const store = transaction.objectStore('songs');
            const request = store.getAll();

            request.onsuccess = () => {
                const sorted = request.result.sort((a, b) => a.id - b.id);
                resolve(sorted);
            };

            request.onerror = () => reject("Müzikler alınamadı.");
        });
    }

    function saveSongToDB(song) {
        return new Promise((resolve, reject) => {
            if (!db) return reject("Database not initialized");

            const transaction = db.transaction(['songs'], 'readwrite');
            const store = transaction.objectStore('songs');
            const request = store.put(song);

            request.onsuccess = () => resolve();
            request.onerror = () => reject("Müzik kaydedilemedi.");
        });
    }

    function deleteSongFromDB(id) {
        return new Promise((resolve, reject) => {
            if (!db) return reject("Database not initialized");

            const transaction = db.transaction(['songs'], 'readwrite');
            const store = transaction.objectStore('songs');
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject("Müzik silinemedi.");
        });
    }

    function getAllPhotosFromDB() {
        return new Promise((resolve, reject) => {
            if (!db) return reject("Database not initialized");
            
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();

            request.onsuccess = () => {
                // Sort by ID (timestamp) descending (newest photos first)
                const sorted = request.result.sort((a, b) => b.id - a.id);
                resolve(sorted);
            };

            request.onerror = () => reject("Fotoğraflar alınamadı.");
        });
    }

    function savePhotoToDB(photo) {
        return new Promise((resolve, reject) => {
            if (!db) return reject("Database not initialized");

            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(photo);

            request.onsuccess = () => resolve();
            request.onerror = () => reject("Fotoğraf kaydedilemedi.");
        });
    }

    function deletePhotoFromDB(id) {
        return new Promise((resolve, reject) => {
            if (!db) return reject("Database not initialized");

            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject("Fotoğraf silinemedi.");
        });
    }


    // --- 4. IMAGE COMPRESSION & PROCESSING ---
    function compressImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    
                    // Max resolution bound (e.g. 1280px max dimension)
                    const MAX_BOUND = 1280;
                    if (width > height) {
                        if (width > MAX_BOUND) {
                            height = Math.round((height * MAX_BOUND) / width);
                            width = MAX_BOUND;
                        }
                    } else {
                        if (height > MAX_BOUND) {
                            width = Math.round((width * MAX_BOUND) / height);
                            height = MAX_BOUND;
                        }
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Compress as JPEG with 0.8 quality
                    const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
                    resolve(compressedBase64);
                };
                
                img.onerror = () => reject("Görsel yüklenemedi.");
            };
            
            reader.onerror = () => reject("Dosya okunamadı.");
        });
    }


    // --- 5. RENDER GALLERY ---
    function createGalleryItemDOM(photo, index) {
        const item = document.createElement('div');
        item.className = 'gallery-item';
        item.dataset.index = index;
        item.tabIndex = 0; // Accessible focus

        const img = document.createElement('img');
        img.src = photo.dataUrl;
        img.alt = `Sude & Furkan Anı #${photosList.length - index}`;
        img.loading = 'lazy';
        
        const overlay = document.createElement('div');
        overlay.className = 'item-overlay';
        
        // Simple human-readable relative/added date
        const dateSpan = document.createElement('span');
        dateSpan.className = 'photo-date';
        dateSpan.textContent = photo.dateAdded;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-photo-btn';
        deleteBtn.ariaLabel = 'Fotoğrafı Sil';
        deleteBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
        `;
        
        // Event Listeners for Photo Card
        // Delete button stop propagation so lightbox does not open
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm("Bu fotoğrafı albümden silmek istediğinize emin misiniz?")) {
                deletePhoto(photo.id);
            }
        });
        
        overlay.appendChild(dateSpan);
        overlay.appendChild(deleteBtn);
        item.appendChild(img);
        item.appendChild(overlay);

        // Click to Open Lightbox
        item.addEventListener('click', () => {
            openLightbox(index);
        });

        // Accessible Enter Key press
        item.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                openLightbox(index);
            }
        });

        return item;
    }

    async function loadAndRenderGallery() {
        try {
            photosList = await getAllPhotosFromDB();
            
            // Clear current items except empty state
            const items = elements.galleryGrid.querySelectorAll('.gallery-item');
            items.forEach(el => el.remove());
            
            if (photosList.length === 0) {
                elements.emptyState.style.display = 'flex';
            } else {
                elements.emptyState.style.display = 'none';
                photosList.forEach((photo, index) => {
                    const itemDOM = createGalleryItemDOM(photo, index);
                    elements.galleryGrid.appendChild(itemDOM);
                });
            }
        } catch (error) {
            console.error("Gallery render error:", error);
            alert("Galeri yüklenirken bir hata oluştu.");
        }
    }

    async function deletePhoto(id) {
        try {
            await deletePhotoFromDB(id);
            await loadAndRenderGallery();
        } catch (error) {
            console.error("Delete photo error:", error);
            alert("Fotoğraf silinirken bir hata oluştu.");
        }
    }

    // Handle Uploads
    elements.photoUpload.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        // Show a temporary shimmer loader card in grid
        const tempCards = [];
        files.forEach(() => {
            const loaderCard = document.createElement('div');
            loaderCard.className = 'gallery-item loading';
            elements.galleryGrid.appendChild(loaderCard);
            tempCards.push(loaderCard);
            elements.emptyState.style.display = 'none';
        });

        const now = new Date();
        const dateStr = now.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });

        for (let i = 0; i < files.length; i++) {
            try {
                const compressedDataUrl = await compressImage(files[i]);
                const photoObj = {
                    id: Date.now() + i, // Unique key
                    dataUrl: compressedDataUrl,
                    dateAdded: dateStr
                };
                await savePhotoToDB(photoObj);
            } catch (err) {
                console.error("Image processing error:", err);
                alert(`${files[i].name} yüklenirken hata oluştu.`);
            }
        }

        // Clean loader elements and refresh
        tempCards.forEach(c => c.remove());
        elements.photoUpload.value = ''; // Reset input
        await loadAndRenderGallery();
    });


    // --- 6. LIGHTBOX / PHOTO PREVIEW ---
    function openLightbox(index) {
        currentLightboxIndex = index;
        const photo = photosList[index];
        if (!photo) return;

        elements.lightboxImg.src = photo.dataUrl;
        elements.lightboxCaption.textContent = `Yüklenme Tarihi: ${photo.dateAdded}`;
        elements.lightbox.classList.add('active');
        document.body.style.overflow = 'hidden'; // Lock background scrolling
    }

    function closeLightbox() {
        elements.lightbox.classList.remove('active');
        document.body.style.overflow = '';
        setTimeout(() => {
            elements.lightboxImg.src = ''; // Clear image src after animation finishes
        }, 300);
    }

    function navigateLightbox(direction) {
        if (photosList.length <= 1) return;
        
        let newIndex = currentLightboxIndex + direction;
        
        if (newIndex < 0) {
            newIndex = photosList.length - 1; // Wrap around to end
        } else if (newIndex >= photosList.length) {
            newIndex = 0; // Wrap around to beginning
        }
        
        currentLightboxIndex = newIndex;
        const photo = photosList[newIndex];
        
        // Soft crossfade effect by quickly clearing and setting
        elements.lightboxImg.style.opacity = 0;
        setTimeout(() => {
            elements.lightboxImg.src = photo.dataUrl;
            elements.lightboxCaption.textContent = `Yüklenme Tarihi: ${photo.dateAdded}`;
            elements.lightboxImg.style.opacity = 1;
        }, 150);
    }

    // Lightbox Controls
    elements.lightboxClose.addEventListener('click', closeLightbox);
    elements.lightboxPrev.addEventListener('click', () => navigateLightbox(-1));
    elements.lightboxNext.addEventListener('click', () => navigateLightbox(1));
    
    // Close on click background
    elements.lightbox.addEventListener('click', (e) => {
        if (e.target === elements.lightbox) {
            closeLightbox();
        }
    });

    // Keyboard support
    document.addEventListener('keydown', (e) => {
        if (!elements.lightbox.classList.contains('active')) return;
        
        if (e.key === 'Escape') closeLightbox();
        else if (e.key === 'ArrowLeft') navigateLightbox(-1);
        else if (e.key === 'ArrowRight') navigateLightbox(1);
    });

    // Swipe support for mobile lightbox navigation
    elements.lightbox.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    elements.lightbox.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipeGesture();
    }, { passive: true });

    function handleSwipeGesture() {
        const diffX = touchEndX - touchStartX;
        const threshold = 50; // swipe offset threshold
        
        if (Math.abs(diffX) > threshold) {
            if (diffX > 0) {
                // Swiped right -> go to previous photo
                navigateLightbox(-1);
            } else {
                // Swiped left -> go to next photo
                navigateLightbox(1);
            }
        }
    }


    // --- 7. HEART RAIN BACKGROUND EFFECT ---
    const ctx = elements.canvas.getContext('2d');
    let hearts = [];
    const maxHearts = 22; // Keep it clean and performance friendly

    function resizeCanvas() {
        elements.canvas.width = window.innerWidth;
        elements.canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    class HeartParticle {
        constructor() {
            this.reset(true);
        }

        reset(initialStart = false) {
            this.size = Math.random() * 12 + 8; // Size between 8 and 20
            this.x = Math.random() * elements.canvas.width;
            // Place at the bottom, or randomly scattered if initial setup
            this.y = initialStart ? Math.random() * elements.canvas.height : elements.canvas.height + 20;
            this.speedY = -(Math.random() * 0.7 + 0.3); // Gentle float upward
            this.speedX = Math.random() * 0.4 - 0.2; // Tiny drift left/right
            this.swingSpeed = Math.random() * 0.02 + 0.01;
            this.swingRange = Math.random() * 1.5 + 0.5;
            this.swingAngle = Math.random() * Math.PI * 2;
            
            // Choose color: pink themes, blush pinks, and gold accents
            const colorChoices = [
                { r: 255, g: 133, b: 161 }, // Light Pink
                { r: 255, g: 182, b: 193 }, // Light Pink alternative
                { r: 229, g: 193, b: 88 }   // Warm Gold Accent
            ];
            const color = colorChoices[Math.floor(Math.random() * colorChoices.length)];
            this.r = color.r;
            this.g = color.g;
            this.b = color.b;
            
            this.opacity = Math.random() * 0.3 + 0.15; // Subtle semi-transparent opacity
            this.rotation = Math.random() * Math.PI * 2;
            this.rotationSpeed = Math.random() * 0.01 - 0.005;
        }

        update() {
            this.y += this.speedY;
            this.swingAngle += this.swingSpeed;
            this.x += this.speedX + Math.sin(this.swingAngle) * (this.swingRange * 0.3);
            this.rotation += this.rotationSpeed;
            
            // Fade out as it gets closer to top of screen
            if (this.y < elements.canvas.height * 0.3) {
                this.opacity -= 0.003;
            }

            // Reset when faded out or off screen
            if (this.y < -30 || this.opacity <= 0 || this.x < -30 || this.x > elements.canvas.width + 30) {
                this.reset(false);
            }
        }

        draw() {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation);
            ctx.beginPath();
            
            // Precise Bezier curve for clean vector heart drawing on canvas
            const s = this.size;
            ctx.moveTo(0, -s / 4);
            ctx.bezierCurveTo(s / 2, -s / 2, s, -s / 4, s, s / 4);
            ctx.bezierCurveTo(s, s * 0.7, 0, s * 1.15, 0, s * 1.25);
            ctx.bezierCurveTo(0, s * 1.15, -s, s * 0.7, -s, s / 4);
            ctx.bezierCurveTo(-s, -s / 4, -s / 2, -s / 2, 0, -s / 4);
            
            ctx.closePath();
            ctx.fillStyle = `rgba(${this.r}, ${this.g}, ${this.b}, ${this.opacity})`;
            ctx.fill();
            ctx.restore();
        }
    }

    // Initialize particles
    for (let i = 0; i < maxHearts; i++) {
        hearts.push(new HeartParticle());
    }

    function animate() {
        ctx.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
        
        hearts.forEach(heart => {
            heart.update();
            heart.draw();
        });
        
        requestAnimationFrame(animate);
    }
    animate();


    // --- 8. MUSIC PLAYER MANAGEMENT ---
    function formatTime(secs) {
        if (isNaN(secs)) return '00:00';
        const m = Math.floor(secs / 60);
        const s = Math.floor(secs % 60);
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    async function loadPlaylist() {
        try {
            customSongsList = await getAllSongsFromDB();
            playlist = [...DEFAULT_SONGS, ...customSongsList];
            renderPlaylistUI();
            
            // Set initial song (without playing automatically)
            if (playlist.length > 0 && elements.audio.getAttribute('src') === null) {
                loadSong(0, false);
            }
        } catch (error) {
            console.error("Error loading playlist:", error);
        }
    }

    function renderPlaylistUI() {
        elements.playlistItems.innerHTML = '';
        
        playlist.forEach((song, index) => {
            const item = document.createElement('div');
            item.className = 'playlist-item';
            if (index === currentSongIndex) {
                item.classList.add('active');
            }
            
            const leftDiv = document.createElement('div');
            leftDiv.className = 'playlist-item-left';
            
            // Music note icon
            leftDiv.innerHTML = `
                <svg class="song-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                </svg>
                <span class="song-title">${song.title}</span>
            `;
            
            item.appendChild(leftDiv);
            
            // If it is a custom song, show a delete button
            if (!song.isDefault) {
                const delBtn = document.createElement('button');
                delBtn.className = 'delete-song-btn';
                delBtn.ariaLabel = 'Şarkıyı Sil';
                delBtn.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                `;
                
                delBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (confirm(`"${song.title}" şarkısını listeden silmek istediğinize emin misiniz?`)) {
                        deleteCustomSong(song.id, index);
                    }
                });
                
                item.appendChild(delBtn);
            }
            
            // Click song to play
            item.addEventListener('click', () => {
                loadSong(index, true);
            });
            
            elements.playlistItems.appendChild(item);
        });
    }

    async function deleteCustomSong(id, index) {
        try {
            await deleteSongFromDB(id);
            
            // If deleted song is the currently playing one, skip to next or reset
            if (index === currentSongIndex) {
                elements.audio.pause();
                isPlaying = false;
                elements.vinylContainer.classList.remove('playing');
                updatePlayPauseUI(false);
                
                // Load first playlist item
                currentSongIndex = 0;
                await loadPlaylist();
                if (playlist.length > 0) {
                    loadSong(0, false);
                }
            } else {
                // If it's before current song, decrement current index to align correctly
                if (index < currentSongIndex) {
                    currentSongIndex--;
                }
                await loadPlaylist();
                // Re-render highlight
                renderPlaylistUI();
            }
        } catch (error) {
            console.error("Delete song error:", error);
            alert("Şarkı silinirken bir hata oluştu.");
        }
    }

    function loadSong(index, shouldPlay = false) {
        if (index < 0 || index >= playlist.length) return;
        
        currentSongIndex = index;
        const song = playlist[index];
        
        elements.trackTitle.textContent = song.title;
        elements.trackArtist.textContent = song.isDefault ? "Varsayılan Şarkı" : "Yüklenen Şarkı";
        
        // Remove active class from all and add to current
        const items = elements.playlistItems.querySelectorAll('.playlist-item');
        items.forEach((item, idx) => {
            if (idx === index) item.classList.add('active');
            else item.classList.remove('active');
        });
        
        // Load source
        elements.audio.src = song.isDefault ? song.url : song.dataUrl;
        elements.audio.load();
        
        // Reset progress UI
        elements.progressBar.value = 0;
        elements.currentTime.textContent = '00:00';
        elements.totalTime.textContent = '00:00';
        
        if (shouldPlay) {
            playAudio();
        } else {
            pauseAudio();
        }
    }

    function playAudio() {
        elements.audio.play().then(() => {
            isPlaying = true;
            elements.vinylContainer.classList.add('playing');
            updatePlayPauseUI(true);
        }).catch(err => {
            console.warn("Audio autoplay blocked or load error:", err);
            isPlaying = false;
            elements.vinylContainer.classList.remove('playing');
            updatePlayPauseUI(false);
        });
    }

    function pauseAudio() {
        elements.audio.pause();
        isPlaying = false;
        elements.vinylContainer.classList.remove('playing');
        updatePlayPauseUI(false);
    }

    function togglePlayPause() {
        if (playlist.length === 0) return;
        
        if (isPlaying) {
            pauseAudio();
        } else {
            playAudio();
        }
    }

    function updatePlayPauseUI(playing) {
        const playIcon = elements.btnPlayPause.querySelector('.play-icon');
        const pauseIcon = elements.btnPlayPause.querySelector('.pause-icon');
        
        if (playing) {
            playIcon.style.display = 'none';
            pauseIcon.style.display = 'block';
        } else {
            playIcon.style.display = 'block';
            pauseIcon.style.display = 'none';
        }
    }

    function playNext() {
        if (playlist.length <= 1) return;
        let nextIndex = currentSongIndex + 1;
        if (nextIndex >= playlist.length) {
            nextIndex = 0;
        }
        loadSong(nextIndex, true);
    }

    function playPrev() {
        if (playlist.length <= 1) return;
        let prevIndex = currentSongIndex - 1;
        if (prevIndex < 0) {
            prevIndex = playlist.length - 1;
        }
        loadSong(prevIndex, true);
    }

    // Audio Player Event Listeners
    elements.btnPlayPause.addEventListener('click', togglePlayPause);
    elements.btnNext.addEventListener('click', playNext);
    elements.btnPrev.addEventListener('click', playPrev);
    elements.vinylContainer.addEventListener('click', togglePlayPause);
    
    // Toggle Playlist Drawer
    elements.btnPlaylist.addEventListener('click', () => {
        elements.playlistDrawer.classList.toggle('active');
        elements.btnPlaylist.classList.toggle('active');
    });

    // Audio Metadata Loaded
    elements.audio.addEventListener('loadedmetadata', () => {
        elements.totalTime.textContent = formatTime(elements.audio.duration);
        elements.progressBar.max = Math.floor(elements.audio.duration);
    });

    // Audio Time Update
    elements.audio.addEventListener('timeupdate', () => {
        elements.currentTime.textContent = formatTime(elements.audio.currentTime);
        // Only update slider if user is not actively dragging it
        if (!elements.progressBar.classList.contains('seeking')) {
            elements.progressBar.value = Math.floor(elements.audio.currentTime);
        }
    });

    // Audio Ended -> Autoplay Next
    elements.audio.addEventListener('ended', playNext);

    // Audio Error Handling
    elements.audio.addEventListener('error', (e) => {
        console.error("Audio playback error:", e);
    });

    // ProgressBar dragging logic
    elements.progressBar.addEventListener('mousedown', () => {
        elements.progressBar.classList.add('seeking');
    });

    elements.progressBar.addEventListener('mouseup', () => {
        elements.progressBar.classList.remove('seeking');
    });

    elements.progressBar.addEventListener('touchstart', () => {
        elements.progressBar.classList.add('seeking');
    }, { passive: true });

    elements.progressBar.addEventListener('touchend', () => {
        elements.progressBar.classList.remove('seeking');
    }, { passive: true });

    elements.progressBar.addEventListener('change', () => {
        elements.audio.currentTime = elements.progressBar.value;
    });

    // Handle Custom Song Upload
    elements.songUpload.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Visual feedback - change upload button text temporarily
        const labelTextSpan = elements.songUpload.previousElementSibling.querySelector('span');
        const originalText = labelTextSpan.textContent;
        labelTextSpan.textContent = "Yükleniyor...";
        
        // Show alert for large files (> 15MB)
        if (file.size > 15 * 1024 * 1024) {
            alert("Bu müzik dosyası biraz büyük (15MB+). Depolama sınırını aşmamak için daha küçük bir dosya yükleyebilirsiniz.");
        }

        const reader = new FileReader();
        reader.readAsDataURL(file);

        reader.onload = async (event) => {
            try {
                const songObj = {
                    id: Date.now(),
                    title: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
                    dataUrl: event.target.result,
                    type: file.type
                };
                
                await saveSongToDB(songObj);
                await loadPlaylist();
                
                // Reset upload button text
                labelTextSpan.textContent = originalText;
                elements.songUpload.value = ''; // Reset input value
            } catch (err) {
                console.error("Song saving error:", err);
                alert("Müzik kaydedilirken bir hata oluştu.");
                labelTextSpan.textContent = originalText;
            }
        };

        reader.onerror = () => {
            alert("Dosya okunamadı.");
            labelTextSpan.textContent = originalText;
        };
    });


    // --- 9. PASSWORD PROTECTION & INITIALIZATION ---
    function initApp() {
        if (isAppInitialized) return;
        isAppInitialized = true;
        
        initDB().then(() => {
            loadAndRenderGallery();
            loadPlaylist();
        }).catch(err => {
            console.error("IndexedDB initialization failed:", err);
            elements.emptyState.style.display = 'flex';
        });
    }

    function verifyPassword() {
        const inputVal = elements.passwordInput.value.trim();
        
        if (VALID_PASSWORDS.includes(inputVal)) {
            // Success! Save session and transition UI
            sessionStorage.setItem('isUnlocked', 'true');
            document.body.classList.remove('locked');
            elements.passwordScreen.classList.add('fade-out');
            initApp();
        } else {
            // Failure! Shake card and show error
            elements.passwordCard.classList.add('shake');
            elements.passwordInput.classList.add('error-input');
            elements.passwordError.classList.add('active');
            
            // Remove shake class after animation finishes to allow re-shaking
            elements.passwordCard.addEventListener('animationend', () => {
                elements.passwordCard.classList.remove('shake');
            }, { once: true });
            
            // Reset input field and focus
            elements.passwordInput.value = '';
            elements.passwordInput.focus();
        }
    }

    function checkAuth() {
        const isUnlocked = sessionStorage.getItem('isUnlocked') === 'true';
        
        if (isUnlocked) {
            // Already logged in - bypass overlay
            document.body.classList.remove('locked');
            elements.passwordScreen.style.display = 'none';
            initApp();
        } else {
            // Locked - lock body scrolling and show screen overlay
            document.body.classList.add('locked');
            elements.passwordScreen.classList.remove('fade-out');
            elements.passwordInput.focus();
            
            // Bind password submission events
            elements.btnSubmitPassword.addEventListener('click', verifyPassword);
            
            // Enter key press triggers verification
            elements.passwordInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    verifyPassword();
                }
            });
            
            // Reset input outline on typing
            elements.passwordInput.addEventListener('input', () => {
                elements.passwordInput.classList.remove('error-input');
                elements.passwordError.classList.remove('active');
            });
        }
    }

    // Run auth check
    checkAuth();

});
