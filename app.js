// URL Base de la API
const API_BASE_URL = 'https://nekos.life/api/v2';

// IndexedDB Configuración
const DB_NAME = 'NekoExplorerDB';
const DB_VERSION = 1;
const STORE_NAME = 'favorites';
let db;

function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error('Error al abrir IndexedDB:', event.target.error);
            reject(event.target.error);
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const dbInstance = event.target.result;
            if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
                dbInstance.createObjectStore(STORE_NAME, { keyPath: 'url' });
            }
        };
    });
}

function saveFavoriteDB(fav) {
    return new Promise((resolve, reject) => {
        if (!db) return reject('Base de datos no inicializada');
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(fav);

        request.onsuccess = () => resolve(true);
        request.onerror = (e) => reject(e.target.error);
    });
}

function deleteFavoriteDB(url) {
    return new Promise((resolve, reject) => {
        if (!db) return reject('Base de datos no inicializada');
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(url);

        request.onsuccess = () => resolve(true);
        request.onerror = (e) => reject(e.target.error);
    });
}

function getAllFavoritesDB() {
    return new Promise((resolve, reject) => {
        if (!db) return resolve([]);
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = (e) => reject(e.target.error);
    });
}

function isFavoriteDB(url) {
    return new Promise((resolve, reject) => {
        if (!db || !url) return resolve(false);
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(url);

        request.onsuccess = () => resolve(!!request.result);
        request.onerror = () => resolve(false);
    });
}

const BEST_BASE_URL = 'https://nekos.best/api/v2';
// Proxy Vercel Serverless Function — evita el bloqueo CORS/Cloudflare Challenge
// En desarrollo local usa la URL directa como fallback
const IM_BASE_URL = '/api/waifu';

// Estado de la aplicación
const state = {
    currentProvider: localStorage.getItem('neko_provider') || 'nekos.life',
    currentCategory: 'waifu',
    currentImageUrl: '',
    favorites: [], // Se populará desde IndexedDB al iniciar
    activeSection: 'gallery-section',
    isNsfw: false
};

// ==========================================================================
// INICIALIZACIÓN
// ==========================================================================
document.addEventListener('DOMContentLoaded', async () => {
    // Inicializar iconos de Lucide
    lucide.createIcons();
    
    try {
        // Inicializar IndexedDB
        await initDB();
        // Cargar favoritos guardados
        state.favorites = await getAllFavoritesDB();
    } catch (err) {
        console.error('Error al inicializar la base de datos de favoritos:', err);
        showToast('Error al acceder a la base de datos local.', 'error');
    }
    
    // Configurar e inicializar selector de proveedor
    const providerSelect = document.getElementById('providerSelect');
    if (providerSelect) {
        providerSelect.value = state.currentProvider;
        providerSelect.addEventListener('change', (e) => {
            switchProvider(e.target.value);
        });
    }
    
    // Configurar e inicializar el switch de NSFW y el control de edad
    const nsfwToggle = document.getElementById('nsfwToggle');
    const ageGateModal = document.getElementById('ageGateModal');
    const btnConfirmAge = document.getElementById('btnConfirmAge');
    const btnCancelAge = document.getElementById('btnCancelAge');
    
    if (nsfwToggle && ageGateModal && btnConfirmAge && btnCancelAge) {
        nsfwToggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                // Desplegar modal para confirmar edad
                ageGateModal.style.display = 'flex';
            } else {
                // Apagar de forma segura
                toggleNsfwMode(false);
            }
        });
        
        btnConfirmAge.addEventListener('click', () => {
            ageGateModal.style.display = 'none';
            toggleNsfwMode(true);
        });
        
        btnCancelAge.addEventListener('click', () => {
            ageGateModal.style.display = 'none';
            nsfwToggle.checked = false;
            toggleNsfwMode(false);
        });
    }
    // Actualizar título de la página con el proveedor actual
    updatePageTitle();
    
    // Filtrar categorías en el sidebar según proveedor
    filterCategoriesByProvider();
    
    // Cargar la primera imagen
    loadActiveCategoryImage();
    
    // Configurar listeners de navegación
    setupNavigation();
    
    // Configurar sidebar y categorías
    setupCategories();
    
    // Configurar acciones del visor de imágenes
    setupViewerActions();
    
    // Configurar utilidades de texto
    setupTextUtilities();
    
    // Actualizar contador de favoritos en la interfaz
    updateFavoritesBadge();
});

// ==========================================================================
// NAVEGACIÓN Y RUTEADO SPA
// ==========================================================================
function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.app-section');
    const menuToggle = document.getElementById('menuToggle');
    const navMenu = document.getElementById('navMenu');
    
    // Conmutador de menú móvil
    menuToggle.addEventListener('click', () => {
        navMenu.classList.toggle('open');
        const isOpen = navMenu.classList.contains('open');
        menuToggle.innerHTML = `<i data-lucide="${isOpen ? 'x' : 'menu'}"></i>`;
        lucide.createIcons();
    });

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const button = e.currentTarget;
            const targetSectionId = button.getAttribute('data-target');
            console.log('Navegación clicada para sección:', targetSectionId);
            
            // Cerrar menú móvil si está abierto
            if (navMenu.classList.contains('open')) {
                navMenu.classList.remove('open');
                menuToggle.innerHTML = `<i data-lucide="menu"></i>`;
                lucide.createIcons();
            }
            
            // Activar link
            navLinks.forEach(l => l.classList.remove('active'));
            button.classList.add('active');
            
            // Mostrar sección activa con transición
            sections.forEach(section => {
                section.classList.remove('active');
                if (section.id === targetSectionId) {
                    section.classList.add('active');
                    console.log('Sección activada:', section.id);
                }
            });
            
            state.activeSection = targetSectionId;
            
            // Si la sección es Favoritos, renderizar la cuadrícula
            if (targetSectionId === 'favorites-section') {
                renderFavorites();
            }
        });
    });
}

// ==========================================================================
// GESTIÓN DE CATEGORÍAS (SIDEBAR)
// ==========================================================================
function setupCategories() {
    const categoryButtons = document.querySelectorAll('.cat-btn');
    const sidebar = document.getElementById('sidebar');
    const sidebarClose = document.getElementById('sidebarClose');
    const currentCategoryName = document.getElementById('currentCategoryName');
    const activeTag = document.querySelector('.active-tag');

    // Botones de categoría del sidebar
    categoryButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            categoryButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const category = btn.getAttribute('data-category');
            state.currentCategory = category;
            
            // Actualizar interfaz
            currentCategoryName.textContent = btn.textContent.trim();
            
            // Cargar imagen
            loadActiveCategoryImage();
            
            // Cerrar sidebar en móviles
            if (window.innerWidth <= 1024) {
                sidebar.classList.remove('open');
            }
        });
    });

    // En móviles, hacer clic en la etiqueta "Categoría activa" abre el sidebar
    activeTag.style.cursor = 'pointer';
    activeTag.addEventListener('click', () => {
        if (window.innerWidth <= 1024) {
            sidebar.classList.add('open');
        }
    });

    // Botón de cerrar sidebar en móvil
    sidebarClose.addEventListener('click', () => {
        sidebar.classList.remove('open');
    });
}

// ==========================================================================
// GESTIÓN DE PROVEEDORES Y CATEGORÍAS COMPATIBLES
// ==========================================================================
function filterCategoriesByProvider() {
    const provider = state.currentProvider;
    const isNsfw = state.isNsfw;
    const categoryButtons = document.querySelectorAll('.cat-btn');
    const otherGroup = document.getElementById('otherCategoryGroup');
    const reactionsSfwGroup = document.getElementById('reactionsSfwGroup');
    const charactersSfwGroup = document.getElementById('charactersSfwGroup');
    const nsfwCategoryGroup = document.getElementById('nsfwCategoryGroup');
    
    categoryButtons.forEach(btn => {
        const allowed = btn.getAttribute('data-providers');
        
        if (isNsfw) {
            // Si estamos en modo NSFW, solo se muestran los botones que pertenecen al proveedor 'nsfw'
            // Y solo si el proveedor activo es waifu.im
            if (allowed === 'nsfw' && provider === 'waifu.im') {
                btn.style.display = 'flex';
            } else {
                btn.style.display = 'none';
                if (btn.classList.contains('active')) btn.classList.remove('active');
            }
        } else {
            // Si estamos en modo SFW, mostramos los SFW compatibles con el proveedor activo
            if (allowed === 'all' || 
                (allowed.includes('life') && provider === 'nekos.life') || 
                (allowed.includes('best') && provider === 'nekos.best') || 
                (allowed.includes('im') && provider === 'waifu.im')) {
                btn.style.display = 'flex';
            } else {
                btn.style.display = 'none';
                if (btn.classList.contains('active')) btn.classList.remove('active');
            }
        }
    });

    // Controlar visibilidad de grupos completos del sidebar
    if (isNsfw) {
        if (reactionsSfwGroup) reactionsSfwGroup.style.display = 'none';
        if (charactersSfwGroup) charactersSfwGroup.style.display = 'none';
        if (otherGroup) otherGroup.style.display = 'none';
        if (nsfwCategoryGroup) nsfwCategoryGroup.style.display = 'block';
    } else {
        if (reactionsSfwGroup) {
            reactionsSfwGroup.style.display = provider === 'waifu.im' ? 'none' : 'block';
        }
        if (charactersSfwGroup) charactersSfwGroup.style.display = 'block';
        if (otherGroup) otherGroup.style.display = provider === 'nekos.life' ? 'block' : 'none';
        if (nsfwCategoryGroup) nsfwCategoryGroup.style.display = 'none';
    }

    // Garantizar que la categoría activa en el estado sea compatible y esté visible
    const activeBtn = document.querySelector(`.cat-btn[data-category="${state.currentCategory}"]`);
    const isCompatible = activeBtn && (activeBtn.style.display !== 'none');
    
    if (!isCompatible) {
        const firstVisibleBtn = document.querySelector('.cat-btn:not([style*="display: none"])');
        if (firstVisibleBtn) {
            categoryButtons.forEach(btn => btn.classList.remove('active'));
            firstVisibleBtn.classList.add('active');
            state.currentCategory = firstVisibleBtn.getAttribute('data-category');
            const categoryNameEl = document.getElementById('currentCategoryName');
            if (categoryNameEl) {
                categoryNameEl.textContent = firstVisibleBtn.textContent.trim();
            }
        }
    } else if (activeBtn) {
        categoryButtons.forEach(btn => btn.classList.remove('active'));
        activeBtn.classList.add('active');
    }
}

async function switchProvider(providerName) {
    state.currentProvider = providerName;
    localStorage.setItem('neko_provider', providerName);
    
    // Si el usuario selecciona Nekos.life o nekos.best, pero estaba en modo NSFW,
    // debemos apagar el modo NSFW porque no lo soportan.
    if (state.isNsfw && providerName !== 'waifu.im') {
        const nsfwToggle = document.getElementById('nsfwToggle');
        if (nsfwToggle) nsfwToggle.checked = false;
        state.isNsfw = false;
        showToast('Proveedor SFW seleccionado. Se desactivó el modo NSFW.', 'success');
    }
    
    // Filtrar visualmente las categorías compatibles
    filterCategoriesByProvider();
    
    // Verificar si la categoría actual sigue siendo compatible
    const activeBtn = document.querySelector(`.cat-btn[data-category="${state.currentCategory}"]`);
    const isCompatible = activeBtn && (activeBtn.style.display !== 'none');
    
    if (!isCompatible) {
        // Seleccionar la primera categoría compatible disponible en el sidebar
        const firstVisibleBtn = document.querySelector('.cat-btn:not([style*="display: none"])');
        if (firstVisibleBtn) {
            document.querySelectorAll('.cat-btn').forEach(btn => btn.classList.remove('active'));
            firstVisibleBtn.classList.add('active');
            state.currentCategory = firstVisibleBtn.getAttribute('data-category');
            document.getElementById('currentCategoryName').textContent = firstVisibleBtn.textContent.trim();
        }
    } else if (activeBtn) {
        activeBtn.classList.add('active');
    }
    
    // Recargar la imagen
    loadActiveCategoryImage();
    
    const friendlyName = providerName === 'nekos.life' ? 'Nekos.life' : (providerName === 'nekos.best' ? 'nekos.best' : 'waifu.im');
    showToast(`Proveedor cambiado a: ${friendlyName}`, 'success');
    
    // Actualizar el título de la página
    updatePageTitle();
}

// Nueva función para actualizar dinámicamente el título
function updatePageTitle() {
    const providerName = state.currentProvider;
    const friendlyName = providerName === 'nekos.life' ? 'Nekos.life' : (providerName === 'nekos.best' ? 'nekos.best' : 'waifu.im');
    document.title = `NekoExplorer - Explorador Premium de ${friendlyName}`;
}

// Nueva función helper para alternar el modo NSFW
async function toggleNsfwMode(isOn) {
    state.isNsfw = isOn;
    
    // Autoconmutación de proveedor:
    // nekos.life y nekos.best no soportan NSFW. Si se activa, forzar cambio a waifu.im.
    if (isOn && state.currentProvider !== 'waifu.im') {
        state.currentProvider = 'waifu.im';
        const providerSelect = document.getElementById('providerSelect');
        if (providerSelect) providerSelect.value = 'waifu.im';
        localStorage.setItem('neko_provider', 'waifu.im');
        showToast('waifu.im seleccionado automáticamente para contenido NSFW.', 'success');
    }
    
    // Filtrar visualmente
    filterCategoriesByProvider();
    
    // Seleccionar una categoría compatible activa
    const activeBtn = document.querySelector(`.cat-btn[data-category="${state.currentCategory}"]`);
    const isCompatible = activeBtn && (activeBtn.style.display !== 'none');
    
    if (!isCompatible) {
        const firstVisibleBtn = document.querySelector('.cat-btn:not([style*="display: none"])');
        if (firstVisibleBtn) {
            document.querySelectorAll('.cat-btn').forEach(btn => btn.classList.remove('active'));
            firstVisibleBtn.classList.add('active');
            state.currentCategory = firstVisibleBtn.getAttribute('data-category');
            document.getElementById('currentCategoryName').textContent = firstVisibleBtn.textContent.trim();
        }
    } else if (activeBtn) {
        activeBtn.classList.add('active');
    }
    
    // Recargar la imagen
    loadActiveCategoryImage();
    
    if (isOn) {
        showToast('Modo NSFW (18+) activado.', 'success');
    } else {
        showToast('Modo NSFW (18+) desactivado de forma segura.', 'success');
    }
}

// ==========================================================================
// CARGA DE IMÁGENES Y CONTROLADORES API
// ==========================================================================
// Helper para precargar una imagen con una promesa capturable
function preloadImage(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('La ilustración no se pudo descargar del servidor de imágenes. Intenta de nuevo.'));
        img.src = url;
    });
}

async function loadActiveCategoryImage() {
    const skeleton = document.getElementById('imageSkeleton');
    const img = document.getElementById('displayImage');
    const controls = document.getElementById('imageControls');
    const artistCredit = document.getElementById('artistCredit');
    const artistLink = document.getElementById('artistLink');
    
    // Resetear visualización
    skeleton.style.display = 'flex';
    img.style.display = 'none';
    controls.style.opacity = '0';
    controls.style.pointerEvents = 'none';
    if (artistCredit) artistCredit.style.display = 'none';
    
    try {
        let fetchUrl = '';
        const provider = state.currentProvider;
        const isNsfw = state.isNsfw;
        
        if (provider === 'nekos.life') {
            fetchUrl = `${API_BASE_URL}/img/${state.currentCategory}`;
        } else if (provider === 'nekos.best') {
            const apiCategory = (state.currentCategory === 'fox_girl') ? 'kitsune' : state.currentCategory;
            fetchUrl = `${BEST_BASE_URL}/${apiCategory}`;
        } else if (provider === 'waifu.im') {
            const nsfwParam = isNsfw ? 'true' : 'false';
            fetchUrl = `${IM_BASE_URL}?included_tags=${state.currentCategory}&is_nsfw=${nsfwParam}`;
        }
        
        const response = await fetch(fetchUrl);
        if (!response.ok) throw new Error(`Error de conexión con el proveedor (${response.status})`);
        
        const data = await response.json();
        let imageUrl = '';
        let artistName = '';
        let artistHref = '';
        
        if (provider === 'nekos.life') {
            if (!data.url) throw new Error('No se encontró la URL de la ilustración');
            imageUrl = data.url;
        } else if (provider === 'waifu.im') {
            if (!data.items || data.items.length === 0) throw new Error('No se encontraron ilustraciones');
            const item = data.items[0];
            imageUrl = item.url;
            if (item.artists && item.artists.length > 0) {
                artistName = item.artists[0].name;
                artistHref = item.artists[0].pixiv || item.artists[0].twitter || item.source || '#';
            }
        } else if (provider === 'nekos.best') {
            if (!data.results || data.results.length === 0) throw new Error('No se encontraron ilustraciones');
            const result = data.results[0];
            imageUrl = result.url;
            artistName = result.artist_name;
            artistHref = result.artist_href;
        }
        
        state.currentImageUrl = imageUrl;
        
        // Precargar imagen (espera capturable)
        await preloadImage(imageUrl);
        
        // Mostrar imagen
        img.src = imageUrl;
        skeleton.style.display = 'none';
        img.style.display = 'block';
        
        // Configurar créditos de autor si vienen de nekos.best o waifu.im y existen
        if ((provider === 'nekos.best' || provider === 'waifu.im') && artistName && artistCredit && artistLink) {
            artistLink.textContent = artistName;
            artistLink.href = artistHref || '#';
            artistCredit.style.display = 'flex';
        }
        
        // Actualizar estado del botón favoritos para la nueva imagen
        await updateFavButtonState();
        
        // Mostrar controles con animación
        controls.style.opacity = '1';
        controls.style.pointerEvents = 'auto';
        
    } catch (error) {
        console.error('Error al cargar la ilustración:', error);
        skeleton.style.display = 'none';
        img.src = '';
        img.style.display = 'none';
        showToast(error.message || 'Error de red al conectar con el servidor.', 'error');
    }
}

// Cargar imagen aleatoria general (Filtrada por categorías visibles)
async function loadRandomImage() {
    const visibleCategoryButtons = Array.from(document.querySelectorAll('.cat-btn')).filter(btn => btn.style.display !== 'none');
    
    if (visibleCategoryButtons.length === 0) {
        showToast('No hay categorías disponibles.', 'error');
        return;
    }
    
    const randomIndex = Math.floor(Math.random() * visibleCategoryButtons.length);
    const randomBtn = visibleCategoryButtons[randomIndex];
    
    randomBtn.click();
    showToast(`Categoría aleatoria: ${randomBtn.textContent.trim()}`, 'success');
}

// ==========================================================================
// CONTROLES DEL VISOR DE IMAGEN
// ==========================================================================
function setupViewerActions() {
    const btnNext = document.getElementById('btnNext');
    const btnRandom = document.getElementById('btnRandom');
    const btnFav = document.getElementById('btnFav');
    const btnCopy = document.getElementById('btnCopy');
    const btnDownload = document.getElementById('btnDownload');
    const btnFullscreen = document.getElementById('btnFullscreen');
    
    // Lightbox elementos
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightboxImage');
    const lightboxClose = document.getElementById('lightboxClose');
    const lightboxDownload = document.getElementById('lightboxDownload');
    const lightboxCopy = document.getElementById('lightboxCopy');

    // Cargar siguiente
    btnNext.addEventListener('click', loadActiveCategoryImage);
    
    // Aleatorio total
    btnRandom.addEventListener('click', loadRandomImage);
    
    // Añadir/Remover favoritos
    btnFav.addEventListener('click', toggleFavorite);
    
    // Copiar enlace
    btnCopy.addEventListener('click', () => {
        copyToClipboard(state.currentImageUrl);
    });
    
    // Descargar
    btnDownload.addEventListener('click', () => {
        downloadImage(state.currentImageUrl, `neko-${state.currentCategory}`);
    });
    
    // Pantalla completa (abrir lightbox)
    btnFullscreen.addEventListener('click', () => {
        lightboxImg.src = state.currentImageUrl;
        lightbox.style.display = 'flex';
    });
    
    // Cerrar lightbox
    lightboxClose.addEventListener('click', () => {
        lightbox.style.display = 'none';
    });
    
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox || e.target.classList.contains('lightbox-content')) {
            lightbox.style.display = 'none';
        }
    });

    // Botones del lightbox
    lightboxDownload.addEventListener('click', () => {
        downloadImage(state.currentImageUrl, `neko-${state.currentCategory}`);
    });
    lightboxCopy.addEventListener('click', () => {
        copyToClipboard(state.currentImageUrl);
    });
}

// ==========================================================================
// GESTIÓN DE FAVORITOS (IndexedDB)
// ==========================================================================
async function toggleFavorite() {
    const isFav = await isFavoriteDB(state.currentImageUrl);
    
    if (!isFav) {
        // Añadir a favoritos
        const fav = {
            url: state.currentImageUrl,
            category: state.currentCategory,
            timestamp: Date.now()
        };
        await saveFavoriteDB(fav);
        showToast('Guardado en favoritos ❤️', 'success');
    } else {
        // Eliminar de favoritos
        await deleteFavoriteDB(state.currentImageUrl);
        showToast('Eliminado de favoritos 💔', 'success');
    }
    
    // Sincronizar estado en memoria y actualizar UI
    state.favorites = await getAllFavoritesDB();
    await updateFavButtonState();
    updateFavoritesBadge();
}

async function removeFavoriteByUrl(url) {
    await deleteFavoriteDB(url);
    state.favorites = await getAllFavoritesDB();
    updateFavoritesBadge();
    
    // Si la imagen que borramos está actualmente abierta en el visor principal, actualizar su botón
    if (url === state.currentImageUrl) {
        await updateFavButtonState();
    }
    
    // Volver a renderizar favoritos si estamos en esa sección
    if (state.activeSection === 'favorites-section') {
        renderFavorites();
    }
    showToast('Favorito eliminado', 'success');
}

async function updateFavButtonState() {
    const btnFav = document.getElementById('btnFav');
    if (!btnFav) return;
    const isFav = await isFavoriteDB(state.currentImageUrl);
    
    if (isFav) {
        btnFav.classList.add('is-favorite');
    } else {
        btnFav.classList.remove('is-favorite');
    }
}

function updateFavoritesBadge() {
    const badge = document.getElementById('favCount');
    badge.textContent = state.favorites.length;
}

function renderFavorites() {
    const grid = document.getElementById('favsGrid');
    const emptyState = document.getElementById('favsEmptyState');
    
    if (state.favorites.length === 0) {
        grid.style.display = 'none';
        emptyState.style.display = 'flex';
        return;
    }
    
    emptyState.style.display = 'none';
    grid.innerHTML = '';
    grid.style.display = 'grid';
    
    state.favorites.slice().reverse().forEach(fav => {
        const item = document.createElement('div');
        item.className = 'fav-item glass-panel';
        
        item.innerHTML = `
            <img src="${fav.url}" alt="Ilustración favorita de ${fav.category}" loading="lazy">
            <span class="fav-item-category">${fav.category}</span>
            <div class="fav-overlay">
                <button class="fav-action-btn view-btn" title="Ver en pantalla completa">
                    <i data-lucide="maximize-2"></i>
                </button>
                <button class="fav-action-btn download-btn" title="Descargar">
                    <i data-lucide="download"></i>
                </button>
                <button class="fav-action-btn delete-btn" title="Eliminar de favoritos">
                    <i data-lucide="trash-2"></i>
                </button>
            </div>
        `;
        
        // Agregar manejadores de eventos
        const viewBtn = item.querySelector('.view-btn');
        const downloadBtn = item.querySelector('.download-btn');
        const deleteBtn = item.querySelector('.delete-btn');
        
        // Hacer que hacer clic en la imagen abra también la pantalla completa
        item.querySelector('img').addEventListener('click', () => viewBtn.click());
        
        viewBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const lightbox = document.getElementById('lightbox');
            const lightboxImg = document.getElementById('lightboxImage');
            lightboxImg.src = fav.url;
            lightbox.style.display = 'flex';
        });
        
        downloadBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            downloadImage(fav.url, `neko-${fav.category}`);
        });
        
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeFavoriteByUrl(fav.url);
        });
        
        grid.appendChild(item);
    });
    
    // Inicializar iconos lucide en las nuevas tarjetas
    lucide.createIcons();
}

// ==========================================================================
// UTILIDADES COMPLEMENTARIAS (Descargas, Portapapeles, Toasts)
// ==========================================================================
function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
        .then(() => {
            showToast('¡Enlace copiado al portapapeles! 📋', 'success');
        })
        .catch(err => {
            console.error('No se pudo copiar el texto: ', err);
            showToast('No se pudo copiar automáticamente.', 'error');
        });
}

// Descarga premium con Fetch Blob
async function downloadImage(url, filename) {
    showToast('Iniciando descarga...', 'success');
    
    try {
        const response = await fetch(url, { mode: 'cors' });
        if (!response.ok) throw new Error('Respuesta de red no válida');
        
        const blob = await response.blob();
        
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        
        // Intentar extraer la extensión de la imagen
        const extension = url.split('.').pop().split(/\#|\?/)[0] || 'jpg';
        link.download = `${filename}.${extension}`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
        console.warn('Descarga con Blob fallida (CORS/Seguridad). Abriendo enlace en pestaña nueva.', error);
        window.open(url, '_blank');
    }
}

// Sistema Toast
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const iconName = type === 'success' ? 'check-circle' : 'alert-circle';
    toast.innerHTML = `
        <i data-lucide="${iconName}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    lucide.createIcons();
    
    // Iniciar temporizador de desvanecimiento
    setTimeout(() => {
        toast.classList.add('fade-out');
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }, 3000);
}

// ==========================================================================
// SECCIÓN 3: UTILIDADES DE TEXTO
// ==========================================================================
function setupTextUtilities() {
    const btnOwoify = document.getElementById('btnOwoify');
    const owoInput = document.getElementById('owoInput');
    const owoResult = document.getElementById('owoResult');
    const owoResultText = document.getElementById('owoResultText');
    const btnCopyOwo = document.getElementById('btnCopyOwo');
    
    const btn8Ball = document.getElementById('btn8Ball');
    const ballQuestion = document.getElementById('ballQuestion');
    const ballAnswer = document.getElementById('ballAnswer');
    const ballGraphic = document.getElementById('magic8BallGraphic');
    
    const btnFact = document.getElementById('btnFact');
    const btnWhy = document.getElementById('btnWhy');
    const phraseResult = document.getElementById('phraseResult');
    const phraseType = document.getElementById('phraseType');
    const phraseResultText = document.getElementById('phraseResultText');
    const btnCopyPhrase = document.getElementById('btnCopyPhrase');

    // 1. OWOIFY
    btnOwoify.addEventListener('click', async () => {
        const text = owoInput.value.trim();
        if (!text) {
            showToast('Escribe un texto primero.', 'error');
            return;
        }
        
        btnOwoify.disabled = true;
        btnOwoify.innerHTML = '<i data-lucide="loader" class="pulse-icon"></i> Traduciendo...';
        lucide.createIcons();
        
        try {
            const res = await fetch(`${API_BASE_URL}/owoify?text=${encodeURIComponent(text)}`);
            if (!res.ok) throw new Error();
            const data = await res.json();
            
            owoResultText.textContent = data.owo;
            owoResult.style.display = 'block';
            showToast('¡Texto OwOificado con éxito!', 'success');
        } catch {
            showToast('Error al conectar con la API de traducción.', 'error');
        } finally {
            btnOwoify.disabled = false;
            btnOwoify.textContent = 'OwOificar!';
        }
    });

    btnCopyOwo.addEventListener('click', () => {
        copyToClipboard(owoResultText.textContent);
    });

    // 2. BOLA 8 MÁGICA
    btn8Ball.addEventListener('click', async () => {
        const question = ballQuestion.value.trim();
        if (!question) {
            showToast('Haz una pregunta a la Bola mística.', 'error');
            return;
        }

        // Sacudida visual
        ballGraphic.classList.add('shake');
        ballAnswer.style.opacity = '0';
        
        try {
            const res = await fetch(`${API_BASE_URL}/8ball`);
            if (!res.ok) throw new Error();
            const data = await res.json();
            
            // Esperar a que acabe la animación de sacudida
            setTimeout(() => {
                ballGraphic.classList.remove('shake');
                ballAnswer.textContent = data.response || 'El destino es incierto';
                ballAnswer.style.animation = 'answerFade 0.6s forwards';
            }, 600);
            
        } catch {
            setTimeout(() => {
                ballGraphic.classList.remove('shake');
                ballAnswer.textContent = 'Error místico';
                ballAnswer.style.opacity = '1';
                showToast('Error al conectar con el oráculo.', 'error');
            }, 600);
        }
    });

    // 3. FACT & WHY
    async function fetchPhrase(endpoint, title) {
        phraseResult.style.display = 'none';
        
        try {
            const res = await fetch(`${API_BASE_URL}/${endpoint}`);
            if (!res.ok) throw new Error();
            const data = await res.json();
            
            const textContent = endpoint === 'fact' ? data.fact : data.why;
            
            phraseType.textContent = title;
            phraseResultText.textContent = textContent;
            phraseResult.style.display = 'block';
            
        } catch {
            showToast('Error al obtener la frase.', 'error');
        }
    }

    btnFact.addEventListener('click', () => fetchPhrase('fact', 'Dato curioso del día:'));
    btnWhy.addEventListener('click', () => fetchPhrase('why', 'Pregunta reflexiva:'));
    
    btnCopyPhrase.addEventListener('click', () => {
        copyToClipboard(phraseResultText.textContent);
    });
}
