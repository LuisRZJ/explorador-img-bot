// URL Base de la API
const API_BASE_URL = 'https://nekos.life/api/v2';

// IndexedDB Configuración
const DB_NAME = 'NekoExplorerDB';
const DB_VERSION = 2;
const STORE_NAME = 'favorites';
const HISTORY_STORE_NAME = 'search_history';
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
            if (!dbInstance.objectStoreNames.contains(HISTORY_STORE_NAME)) {
                dbInstance.createObjectStore(HISTORY_STORE_NAME, { keyPath: 'tag' });
            }
        };
    });
}

function saveSearchTagDB(tag) {
    return new Promise((resolve, reject) => {
        if (!db) return reject('Base de datos no inicializada');
        const transaction = db.transaction([HISTORY_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(HISTORY_STORE_NAME);
        
        const item = { tag: tag, timestamp: Date.now() };
        store.put(item);
        
        transaction.oncomplete = () => {
            limitSearchHistorySize();
            resolve(true);
        };
        transaction.onerror = (e) => reject(e.target.error);
    });
}

function limitSearchHistorySize() {
    if (!db) return;
    const transaction = db.transaction([HISTORY_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(HISTORY_STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
        let items = request.result || [];
        if (items.length > 20) {
            items.sort((a, b) => a.timestamp - b.timestamp);
            const toDeleteCount = items.length - 20;
            const deleteTransaction = db.transaction([HISTORY_STORE_NAME], 'readwrite');
            const deleteStore = deleteTransaction.objectStore(HISTORY_STORE_NAME);
            for (let i = 0; i < toDeleteCount; i++) {
                deleteStore.delete(items[i].tag);
            }
        }
    };
}

function deleteSearchTagDB(tag) {
    return new Promise((resolve, reject) => {
        if (!db) return reject('Base de datos no inicializada');
        const transaction = db.transaction([HISTORY_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(HISTORY_STORE_NAME);
        const request = store.delete(tag);

        request.onsuccess = () => resolve(true);
        request.onerror = (e) => reject(e.target.error);
    });
}

function clearAllSearchTagsDB() {
    return new Promise((resolve, reject) => {
        if (!db) return reject('Base de datos no inicializada');
        const transaction = db.transaction([HISTORY_STORE_NAME], 'readwrite');
        const store = transaction.objectStore(HISTORY_STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => resolve(true);
        request.onerror = (e) => reject(e.target.error);
    });
}

function getAllSearchTagsDB() {
    return new Promise((resolve, reject) => {
        if (!db) return resolve([]);
        const transaction = db.transaction([HISTORY_STORE_NAME], 'readonly');
        const store = transaction.objectStore(HISTORY_STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
            let items = request.result || [];
            items.sort((a, b) => b.timestamp - a.timestamp);
            resolve(items.map(item => item.tag));
        };
        request.onerror = () => resolve([]);
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
    isNsfw: false,
    e621HistoryExpanded: false
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
    
    // Configurar e inicializar selector de emparejamiento para Gifukai
    const pairingSelect = document.getElementById('pairingSelect');
    if (pairingSelect) {
        pairingSelect.addEventListener('change', () => {
            loadActiveCategoryImage();
        });
    }
    togglePairingSelector(state.currentProvider);
    
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
    
    // Configurar buscador manual de etiquetas de e621
    setupE621TagSearch();
    
    // Configurar documentación de APIs y playgrounds
    setupDocs();
    
    // Actualizar contador de favoritos en la interfaz
    updateFavoritesBadge();

    // Actualizar año dinámico en el footer
    const currentYearEl = document.getElementById('currentYear');
    if (currentYearEl) {
        currentYearEl.textContent = new Date().getFullYear();
    }
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
            
            // Limpiar input de búsqueda de e621
            const tagInput = document.getElementById('e621TagInput');
            if (tagInput) tagInput.value = '';

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
    const e621Group = document.getElementById('e621CategoryGroup');
    const nekobotGroup = document.getElementById('nekobotCategoryGroup');
    
    categoryButtons.forEach(btn => {
        const allowed = btn.getAttribute('data-providers');
        
        if (provider === 'e621') {
            if (isNsfw) {
                if (allowed === 'e621' || allowed === 'e621_nsfw') {
                    btn.style.display = 'flex';
                } else {
                    btn.style.display = 'none';
                    if (btn.classList.contains('active')) btn.classList.remove('active');
                }
            } else {
                if (allowed === 'e621') {
                    btn.style.display = 'flex';
                } else {
                    btn.style.display = 'none';
                    if (btn.classList.contains('active')) btn.classList.remove('active');
                }
            }
        } else if (provider === 'nekobot') {
            if (isNsfw) {
                if (allowed === 'nekobot_nsfw') {
                    btn.style.display = 'flex';
                } else {
                    btn.style.display = 'none';
                    if (btn.classList.contains('active')) btn.classList.remove('active');
                }
            } else {
                if (allowed === 'nekobot') {
                    btn.style.display = 'flex';
                } else {
                    btn.style.display = 'none';
                    if (btn.classList.contains('active')) btn.classList.remove('active');
                }
            }
        } else if (isNsfw) {
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
                (allowed.includes('im') && provider === 'waifu.im') ||
                (provider === 'gifukai' && (allowed === 'all' || allowed.includes('best') || allowed.includes('gifukai')) && btn.getAttribute('data-category') !== 'baka')) {
                btn.style.display = 'flex';
            } else {
                btn.style.display = 'none';
                if (btn.classList.contains('active')) btn.classList.remove('active');
            }
        }
    });

    // Controlar visibilidad de grupos completos del sidebar
    const e621TagSearch = document.getElementById('e621TagSearch');
    if (provider === 'e621') {
        if (reactionsSfwGroup) reactionsSfwGroup.style.display = 'none';
        if (charactersSfwGroup) charactersSfwGroup.style.display = 'none';
        if (otherGroup) otherGroup.style.display = 'none';
        if (nsfwCategoryGroup) nsfwCategoryGroup.style.display = 'none';
        if (e621Group) e621Group.style.display = 'block';
        if (nekobotGroup) nekobotGroup.style.display = 'none';
        if (e621TagSearch) e621TagSearch.style.display = 'block';
    } else if (provider === 'nekobot') {
        if (reactionsSfwGroup) reactionsSfwGroup.style.display = 'none';
        if (charactersSfwGroup) charactersSfwGroup.style.display = 'none';
        if (otherGroup) otherGroup.style.display = 'none';
        if (nsfwCategoryGroup) nsfwCategoryGroup.style.display = 'none';
        if (e621Group) e621Group.style.display = 'none';
        if (nekobotGroup) nekobotGroup.style.display = 'block';
        if (e621TagSearch) e621TagSearch.style.display = 'none';
    } else if (isNsfw) {
        if (reactionsSfwGroup) reactionsSfwGroup.style.display = 'none';
        if (charactersSfwGroup) charactersSfwGroup.style.display = 'none';
        if (otherGroup) otherGroup.style.display = 'none';
        if (nsfwCategoryGroup) nsfwCategoryGroup.style.display = 'block';
        if (e621Group) e621Group.style.display = 'none';
        if (nekobotGroup) nekobotGroup.style.display = 'none';
        if (e621TagSearch) e621TagSearch.style.display = 'none';
    } else {
        if (reactionsSfwGroup) {
            reactionsSfwGroup.style.display = provider === 'waifu.im' ? 'none' : 'block';
        }
        if (charactersSfwGroup) charactersSfwGroup.style.display = 'block';
        if (otherGroup) otherGroup.style.display = provider === 'nekos.life' ? 'block' : 'none';
        if (nsfwCategoryGroup) nsfwCategoryGroup.style.display = 'none';
        if (e621Group) e621Group.style.display = 'none';
        if (nekobotGroup) nekobotGroup.style.display = 'none';
        if (e621TagSearch) e621TagSearch.style.display = 'none';
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
    
    // Si el usuario selecciona un proveedor SFW pero estaba en modo NSFW,
    // debemos apagar el modo NSFW porque no lo soportan.
    if (state.isNsfw && providerName !== 'waifu.im' && providerName !== 'e621' && providerName !== 'nekobot') {
        const nsfwToggle = document.getElementById('nsfwToggle');
        if (nsfwToggle) nsfwToggle.checked = false;
        state.isNsfw = false;
        showToast('Proveedor SFW seleccionado. Se desactivó el modo NSFW.', 'success');
    }
    
    // Mostrar u ocultar el selector de emparejamiento para Gifukai
    togglePairingSelector(providerName);
    
    // Filtrar visualmente las categorías compatibles
    filterCategoriesByProvider();
    
    // Limpiar clases active
    document.querySelectorAll('.cat-btn').forEach(btn => btn.classList.remove('active'));

    const activeBtn = document.querySelector(`.cat-btn[data-category="${state.currentCategory}"]`);
    const isCompatible = activeBtn && (activeBtn.style.display !== 'none');

    if (!isCompatible) {
        // Seleccionar la primera categoría compatible disponible en el sidebar
        const firstVisibleBtn = document.querySelector('.cat-btn:not([style*="display: none"])');
        if (firstVisibleBtn) {
            firstVisibleBtn.classList.add('active');
            state.currentCategory = firstVisibleBtn.getAttribute('data-category');
            document.getElementById('currentCategoryName').textContent = firstVisibleBtn.textContent.trim();
        }
    } else if (activeBtn) {
        activeBtn.classList.add('active');
    }

    // Limpiar input de búsqueda manual
    const tagInput = document.getElementById('e621TagInput');
    if (tagInput) tagInput.value = '';
    
    // Recargar la imagen
    loadActiveCategoryImage();
    
    let friendlyName = providerName;
    if (providerName === 'nekos.life') friendlyName = 'Nekos.life';
    else if (providerName === 'nekos.best') friendlyName = 'nekos.best';
    else if (providerName === 'waifu.im') friendlyName = 'waifu.im';
    else if (providerName === 'e621') friendlyName = 'e621 (Furry)';
    else if (providerName === 'nekobot') friendlyName = 'NekoBot.xyz';
    else if (providerName === 'gifukai') friendlyName = 'Gifukai';
    
    showToast(`Proveedor cambiado a: ${friendlyName}`, 'success');
    
    // Actualizar el título de la página
    updatePageTitle();
}

// Nueva función para actualizar dinámicamente el título
function updatePageTitle() {
    const providerName = state.currentProvider;
    let friendlyName = providerName;
    if (providerName === 'nekos.life') friendlyName = 'Nekos.life';
    else if (providerName === 'nekos.best') friendlyName = 'nekos.best';
    else if (providerName === 'waifu.im') friendlyName = 'waifu.im';
    else if (providerName === 'e621') friendlyName = 'e621 / e926';
    else if (providerName === 'nekobot') friendlyName = 'NekoBot.xyz';
    else if (providerName === 'gifukai') friendlyName = 'Gifukai';
    
    document.title = `NekoExplorer - Explorador Premium de ${friendlyName}`;
}

// Función helper para alternar la visibilidad del selector de pairings de Gifukai
function togglePairingSelector(providerName) {
    const wrapper = document.getElementById('pairingSelectorWrapper');
    const select = document.getElementById('pairingSelect');
    const navbar = document.querySelector('.navbar');
    if (wrapper) {
        if (providerName === 'gifukai') {
            wrapper.style.display = 'flex';
            if (navbar) navbar.classList.add('has-pairing');
        } else {
            wrapper.style.display = 'none';
            if (select) select.value = '';
            if (navbar) navbar.classList.remove('has-pairing');
        }
    }
}

// Nueva función helper para alternar el modo NSFW
async function toggleNsfwMode(isOn) {
    state.isNsfw = isOn;
    
    // Autoconmutación de proveedor:
    // nekos.life y nekos.best no soportan NSFW. Si se activa, forzar cambio a waifu.im.
    if (isOn && state.currentProvider !== 'waifu.im' && state.currentProvider !== 'e621' && state.currentProvider !== 'nekobot') {
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
        const provider = state.currentProvider;
        const isNsfw = state.isNsfw;
        const category = state.currentCategory;
        
        // Llamada a nuestro nuevo API Gateway Unificado (Dogfooding)
        let fetchUrl = `/api/v1/image?category=${encodeURIComponent(category)}&provider=${encodeURIComponent(provider)}&nsfw=${isNsfw}`;
        
        // Añadir parámetro de emparejamiento (pairing) si se consulta Gifukai
        const pairingSelect = document.getElementById('pairingSelect');
        if (provider === 'gifukai' && pairingSelect && pairingSelect.value) {
            fetchUrl += `&pairing=${encodeURIComponent(pairingSelect.value)}`;
        }
        
        const response = await fetch(fetchUrl);
        
        const data = await response.json();
        
        if (!response.ok || !data.success) {
            throw new Error(data.error || `Error del Gateway (${response.status})`);
        }
        
        const imageUrl = data.data.url;
        const artistName = data.data.artist ? data.data.artist.name : null;
        const artistHref = data.data.artist ? data.data.artist.url : null;
        const actualProvider = data.data.provider; // Por si el Gateway hizo fallback
        
        state.currentImageUrl = imageUrl;
        
        // Precargar imagen (espera capturable)
        await preloadImage(imageUrl);
        
        // Mostrar imagen
        img.src = imageUrl;
        skeleton.style.display = 'none';
        img.style.display = 'block';
        
        // Configurar créditos de autor si existen
        if (artistName && artistCredit && artistLink) {
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
            const res = await fetch(`/api/owoify?text=${encodeURIComponent(text)}`);
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
            const res = await fetch(`/api/8ball`);
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
        const btn = endpoint === 'fact' ? btnFact : btnWhy;
        const originalText = btn.innerHTML;

        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="loader" class="pulse-icon"></i> Generando...';
        lucide.createIcons();
        
        try {
            // Obtener frase ya traducida directamente de nuestra API
            const res = await fetch(`/api/${endpoint}`);
            if (!res.ok) throw new Error();
            const data = await res.json();
            const translatedText = endpoint === 'fact' ? data.fact : data.why;
            
            phraseType.textContent = title;
            phraseResultText.textContent = translatedText || 'No se obtuvo respuesta';
            phraseResult.style.display = 'block';
            
        } catch {
            showToast('Error al obtener la frase.', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
            lucide.createIcons();
        }
    }

    btnFact.addEventListener('click', () => fetchPhrase('fact', 'Dato curioso del día:'));
    btnWhy.addEventListener('click', () => fetchPhrase('why', 'Pregunta reflexiva:'));
    
    btnCopyPhrase.addEventListener('click', () => {
        copyToClipboard(phraseResultText.textContent);
    });
}

// ==========================================================================
// BÚSQUEDA MANUAL DE ETIQUETAS PARA e621
// ==========================================================================

/**
 * Sanitiza la entrada del usuario para búsquedas en e621.
 * Solo permite caracteres alfanuméricos, guion bajo, guion, espacio,
 * dos puntos (para rating:safe / rating:explicit) y barra (para species/gender).
 * Elimina cualquier caracter que pueda inyectar código HTML/JS.
 * @param {string} raw - Cadena sin sanitizar del usuario.
 * @returns {string} Cadena segura, truncada a 80 caracteres.
 */
function sanitizeE621Tag(raw) {
    if (typeof raw !== 'string') return '';
    // 1. Eliminar todo lo que no sea alfanumérico, espacio, guion, guion_bajo, dos_puntos o barra
    const cleaned = raw.replace(/[^a-zA-Z0-9 _\-:/]/g, '');
    // 2. Colapsar espacios múltiples en uno solo
    const collapsed = cleaned.replace(/\s+/g, ' ').trim();
    // 3. Limitar longitud máxima para evitar payloads gigantes
    return collapsed.slice(0, 80);
}

/**
 * Carga y renderiza los chips de búsquedas recientes de e621 desde IndexedDB.
 */
async function renderE621Recents() {
    const container = document.getElementById('e621Recents');
    const clearBtn = document.getElementById('e621ClearAllRecents');
    const expandDiv = document.getElementById('e621RecentsExpandDiv');
    const expandBtn = document.getElementById('e621ExpandBtn');
    if (!container) return;

    // Limpiar usando textContent / manipulación DOM (jamás innerHTML con datos de usuario)
    container.textContent = '';

    const recents = await getAllSearchTagsDB();
    
    if (recents.length === 0) {
        if (clearBtn) clearBtn.style.display = 'none';
        if (expandDiv) expandDiv.style.display = 'none';
        return;
    }

    if (clearBtn) clearBtn.style.display = 'block';

    const maxVisible = 5;
    const hasMore = recents.length > maxVisible;
    const isExpanded = state.e621HistoryExpanded;
    const visibleTags = (isExpanded || !hasMore) ? recents : recents.slice(0, maxVisible);

    visibleTags.forEach(tag => {
        const chip = document.createElement('button');
        chip.className = 'tag-recent-chip';
        chip.setAttribute('type', 'button');
        chip.setAttribute('aria-label', `Buscar de nuevo: ${tag}`);

        // Icono de reloj
        const iconSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        iconSvg.setAttribute('viewBox', '0 0 24 24');
        iconSvg.setAttribute('fill', 'none');
        iconSvg.setAttribute('stroke', 'currentColor');
        iconSvg.setAttribute('stroke-width', '2');
        iconSvg.setAttribute('stroke-linecap', 'round');
        iconSvg.setAttribute('stroke-linejoin', 'round');
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', '12'); circle.setAttribute('cy', '12'); circle.setAttribute('r', '10');
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        path.setAttribute('points', '12 6 12 12 16 14');
        iconSvg.appendChild(circle);
        iconSvg.appendChild(path);
        chip.appendChild(iconSvg);

        // Texto del tag
        const label = document.createElement('span');
        label.textContent = tag;
        chip.appendChild(label);

        // Botón de eliminar individual
        const removeBtn = document.createElement('span');
        removeBtn.className = 'tag-recent-remove';
        removeBtn.setAttribute('aria-label', `Eliminar búsqueda: ${tag}`);
        removeBtn.innerHTML = '&times;';
        removeBtn.addEventListener('click', async (e) => {
            e.stopPropagation(); // Evitar disparar búsqueda
            await deleteSearchTagDB(tag);
            await renderE621Recents();
        });
        chip.appendChild(removeBtn);

        chip.addEventListener('click', () => {
            triggerE621TagSearch(tag);
        });

        container.appendChild(chip);
    });

    if (hasMore && expandDiv && expandBtn) {
        expandDiv.style.display = 'flex';
        expandBtn.textContent = isExpanded ? 'Ver menos' : `Ver más (+${recents.length - maxVisible})`;
    } else if (expandDiv) {
        expandDiv.style.display = 'none';
    }
}

/**
 * Guarda una etiqueta en el historial de búsquedas recientes (IndexedDB).
 * @param {string} tag - Etiqueta sanitizada a guardar.
 */
async function saveE621Recent(tag) {
    if (!tag) return;
    await saveSearchTagDB(tag);
}

/**
 * Ejecuta la búsqueda con la etiqueta dada, actualizando el estado y disparando la carga.
 * @param {string} rawTag - Etiqueta sin sanitizar (se sanitiza internamente).
 */
async function triggerE621TagSearch(rawTag) {
    const tag = sanitizeE621Tag(rawTag);
    if (!tag) {
        showToast('Introduce una etiqueta válida (solo letras, números y guiones).', 'error');
        return;
    }

    // Actualizar el estado de la aplicación con la etiqueta buscada
    state.currentCategory = tag;

    // Actualizar el nombre de la categoría activa en la UI
    const categoryNameEl = document.getElementById('currentCategoryName');
    if (categoryNameEl) categoryNameEl.textContent = tag;

    // Desmarcar botones predefinidos activos
    document.querySelectorAll('.cat-btn').forEach(btn => btn.classList.remove('active'));

    // Guardar en historial y re-renderizar chips
    await saveE621Recent(tag);
    await renderE621Recents();

    // Lanzar la búsqueda
    loadActiveCategoryImage();
}

/**
 * Configura los eventos del buscador manual de etiquetas de e621.
 * Debe llamarse una vez al inicializar la app.
 */
function setupE621TagSearch() {
    const input = document.getElementById('e621TagInput');
    const btn = document.getElementById('e621SearchBtn');
    const clearBtn = document.getElementById('e621ClearAllRecents');
    const expandBtn = document.getElementById('e621ExpandBtn');
    if (!input || !btn) return;

    // Clic en botón de búsqueda
    if (!btn.dataset.listenerAttached) {
        btn.dataset.listenerAttached = 'true';
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            triggerE621TagSearch(input.value);
            input.value = '';
        });
    }

    // Enter y validación en el campo de texto
    if (!input.dataset.listenerAttached) {
        input.dataset.listenerAttached = 'true';
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                triggerE621TagSearch(input.value);
                input.value = '';
            }
        });

        // Bloquear pegado de contenido con caracteres peligrosos (validación en tiempo real)
        input.addEventListener('input', () => {
            const cleaned = sanitizeE621Tag(input.value);
            if (input.value !== cleaned) {
                input.value = cleaned;
            }
        });
    }

    // Clic en botón de limpiar todo
    if (clearBtn && !clearBtn.dataset.listenerAttached) {
        clearBtn.dataset.listenerAttached = 'true';
        clearBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            await clearAllSearchTagsDB();
            await renderE621Recents();
            showToast('Historial de búsqueda vaciado.', 'success');
        });
    }

    // Clic en botón de expansión
    if (expandBtn && !expandBtn.dataset.listenerAttached) {
        expandBtn.dataset.listenerAttached = 'true';
        expandBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            state.e621HistoryExpanded = !state.e621HistoryExpanded;
            renderE621Recents();
        });
    }

    // Renderizar los chips de búsquedas recientes al iniciar
    renderE621Recents();
}

// ==========================================================================
// SECCIÓN: DOCUMENTACIÓN DE APIS (PLAYGROUND INTERACTIVO)
// ==========================================================================
function setupDocs() {
    const docsNavItems = document.querySelectorAll('.docs-nav-item');
    const docPanes = document.querySelectorAll('.doc-pane');
    
    // Navegación interna de la documentación
    docsNavItems.forEach(item => {
        item.addEventListener('click', () => {
            docsNavItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            const targetPaneId = item.getAttribute('data-pane');
            docPanes.forEach(pane => {
                if (pane.id === targetPaneId) {
                    pane.style.display = 'block';
                } else {
                    pane.style.display = 'none';
                }
            });
        });
    });

    // 1. Playground de Imagen: GET /api/v1/image
    const btnPlayImage = document.getElementById('btnPlayImage');
    const playCategory = document.getElementById('playCategory');
    const playProvider = document.getElementById('playProvider');
    const playPairing = document.getElementById('playPairing');
    const playImageResult = document.getElementById('playImageResult');
    const playImageQueryUrl = document.getElementById('playImageQueryUrl');
    const playImageJsonCode = document.getElementById('playImageJsonCode');

    if (btnPlayImage && playCategory && playProvider) {
        btnPlayImage.addEventListener('click', async () => {
            const category = playCategory.value;
            const provider = playProvider.value;
            
            // Determinar si la categoría requiere NSFW (hentai o hneko)
            const isNsfw = ['hentai', 'hneko'].includes(category);
            
            const host = window.location.host;
            const protocol = host.includes('localhost') ? 'http' : 'https';
            
            // Construir los query params
            const params = new URLSearchParams();
            params.set('category', category);
            if (provider) params.set('provider', provider);
            if (isNsfw) params.set('nsfw', 'true');
            if (playPairing && playPairing.value) params.set('pairing', playPairing.value);
            
            const urlPath = `/api/v1/image?${params.toString()}`;
            const fullUrl = `${protocol}://${host}${urlPath}`;
            
            playImageResult.style.display = 'block';
            playImageQueryUrl.textContent = fullUrl;
            playImageJsonCode.textContent = 'Cargando datos de la API...';
            
            try {
                const res = await fetch(urlPath);
                const data = await res.json();
                playImageJsonCode.textContent = JSON.stringify(data, null, 2);
            } catch (err) {
                playImageJsonCode.textContent = JSON.stringify({ success: false, error: 'Error de red o conexión', details: err.message }, null, 2);
            }
        });
    }

    // 2. Playground de Categorías: GET /api/v1/categories
    const btnPlayCategories = document.getElementById('btnPlayCategories');
    const playCategoriesResult = document.getElementById('playCategoriesResult');
    const playCategoriesJsonCode = document.getElementById('playCategoriesJsonCode');

    if (btnPlayCategories) {
        btnPlayCategories.addEventListener('click', async () => {
            playCategoriesResult.style.display = 'block';
            playCategoriesJsonCode.textContent = 'Consultando Gateway...';
            
            try {
                const res = await fetch('/api/v1/categories');
                const data = await res.json();
                playCategoriesJsonCode.textContent = JSON.stringify(data, null, 2);
            } catch (err) {
                playCategoriesJsonCode.textContent = JSON.stringify({ success: false, error: err.message }, null, 2);
            }
        });
    }

    // 3. Playground de Traducción: GET /api/translate
    const btnPlayTranslate = document.getElementById('btnPlayTranslate');
    const playTranslateText = document.getElementById('playTranslateText');
    const playTranslateResult = document.getElementById('playTranslateResult');
    const playTranslateQueryUrl = document.getElementById('playTranslateQueryUrl');
    const playTranslateJsonCode = document.getElementById('playTranslateJsonCode');

    if (btnPlayTranslate && playTranslateText) {
        btnPlayTranslate.addEventListener('click', async () => {
            const text = playTranslateText.value.trim();
            if (!text) {
                showToast('Por favor introduce un texto válido en inglés.', 'error');
                return;
            }
            
            const host = window.location.host;
            const protocol = host.includes('localhost') ? 'http' : 'https';
            const urlPath = `/api/translate?text=${encodeURIComponent(text)}`;
            const fullUrl = `${protocol}://${host}${urlPath}`;
            
            playTranslateResult.style.display = 'block';
            playTranslateQueryUrl.textContent = fullUrl;
            playTranslateJsonCode.textContent = 'Llamando a Gemma via Serverless Function...';
            
            try {
                const res = await fetch(urlPath);
                const data = await res.json();
                playTranslateJsonCode.textContent = JSON.stringify(data, null, 2);
            } catch (err) {
                playTranslateJsonCode.textContent = JSON.stringify({ error: err.message }, null, 2);
            }
        });
    }

    // 4. Playground de Utilidades: fact, why, owoify, 8ball
    const btnPlayUtility = document.getElementById('btnPlayUtility');
    const playUtilitySelect = document.getElementById('playUtilitySelect');
    const playUtilityInputGroup = document.getElementById('playUtilityInputGroup');
    const playUtilityInputLabel = document.getElementById('playUtilityInputLabel');
    const playUtilityInputValue = document.getElementById('playUtilityInputValue');
    const playUtilityResult = document.getElementById('playUtilityResult');
    const playUtilityQueryUrl = document.getElementById('playUtilityQueryUrl');
    const playUtilityJsonCode = document.getElementById('playUtilityJsonCode');

    if (btnPlayUtility && playUtilitySelect && playUtilityInputValue) {
        // Manejar el cambio del selector
        playUtilitySelect.addEventListener('change', () => {
            const val = playUtilitySelect.value;
            if (val === 'owoify') {
                playUtilityInputGroup.style.display = 'flex';
                playUtilityInputLabel.textContent = 'Texto a Owoify:';
                playUtilityInputValue.value = 'Hello world, how are you doing today?';
            } else if (val === '8ball') {
                playUtilityInputGroup.style.display = 'flex';
                playUtilityInputLabel.textContent = 'Pregunta al oráculo:';
                playUtilityInputValue.value = '¿Tendré buena suerte hoy?';
            } else {
                playUtilityInputGroup.style.display = 'none';
            }
        });

        // Manejar la ejecución
        btnPlayUtility.addEventListener('click', async () => {
            const val = playUtilitySelect.value;
            const inputVal = playUtilityInputValue.value.trim();
            
            let urlPath = `/api/${val}`;
            if (val === 'owoify') {
                if (!inputVal) {
                    showToast('Por favor escribe un texto para owoify.', 'error');
                    return;
                }
                urlPath += `?text=${encodeURIComponent(inputVal)}`;
            } else if (val === '8ball') {
                if (!inputVal) {
                    showToast('Por favor escribe tu pregunta.', 'error');
                    return;
                }
                urlPath += `?question=${encodeURIComponent(inputVal)}`;
            }
            
            const host = window.location.host;
            const protocol = host.includes('localhost') ? 'http' : 'https';
            const fullUrl = `${protocol}://${host}${urlPath}`;
            
            playUtilityResult.style.display = 'block';
            playUtilityQueryUrl.textContent = fullUrl;
            playUtilityJsonCode.textContent = 'Consultando servicio...';
            
            try {
                const res = await fetch(urlPath);
                const data = await res.json();
                playUtilityJsonCode.textContent = JSON.stringify(data, null, 2);
            } catch (err) {
                playUtilityJsonCode.textContent = JSON.stringify({ error: err.message }, null, 2);
            }
        });
    }
}
