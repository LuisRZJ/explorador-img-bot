// api/v1/image.js
const registry = require('../_lib/registry');

// Cargamos los adaptadores
const adapters = {
    'nekos.life': require('../_adapters/nekoslife'),
    'nekos.best': require('../_adapters/nekosbest'),
    'waifu.im': require('../_adapters/waifuim'),
    'nekobot': require('../_adapters/nekobot'),
    'e621': require('../_adapters/e621'),
    'gifukai': require('../_adapters/gifukai')
};

// Función para mezclar array (Fisher-Yates)
function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

module.exports = async (req, res) => {
    // Vercel serverless functions proveen req.query
    const category = req.query.category;
    const forceProvider = req.query.provider;
    const nsfw = req.query.nsfw === 'true';

    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (!category) {
        return res.status(400).json({ success: false, error: 'Parámetro "category" es requerido' });
    }

    let providersToTry = [];

    // Validar categoría en registry
    if (registry.categories[category]) {
        const catInfo = registry.categories[category];
        
        // Si el usuario solicitó nsfw pero la categoría es sfw, es válido, 
        // pero la categoría se mantiene como fue solicitada.
        
        if (forceProvider) {
            // Verificar si el proveedor forzado soporta esta categoría
            if (catInfo.providers.includes(forceProvider)) {
                providersToTry = [forceProvider];
            } else if (forceProvider === 'e621') {
                providersToTry = ['e621'];
            } else {
                return res.status(400).json({ 
                    success: false, 
                    error: `El proveedor '${forceProvider}' no soporta la categoría '${category}'` 
                });
            }
        } else {
            // Balanceo aleatorio entre proveedores disponibles
            providersToTry = shuffleArray(catInfo.providers);
            // NOTA: No metemos e621 por defecto en búsquedas aleatorias SFW normales a menos que se especifique, 
            // ya que e621 es un pool gigantesco con un filtro específico. 
            // Podríamos incluir e621, pero requiere ser manejado. 
            // Por el momento, shuffleArray solo usará los definidos en el registry.
        }
    } else {
        // La categoría no está en el registry estricto.
        // Solo podemos intentar si fuerzan e621, ya que e621 acepta custom tags.
        if (forceProvider === 'e621' || !forceProvider) {
            // Fallback: tratar la categoría desconocida como un tag de e621.
            providersToTry = ['e621'];
        } else {
            return res.status(400).json({ 
                success: false, 
                error: `Categoría '${category}' no encontrada y el proveedor forzado no soporta custom tags.` 
            });
        }
    }

    // Cascada de resiliencia
    let lastError = null;
    
    for (const provider of providersToTry) {
        try {
            const adapter = adapters[provider];
            if (!adapter) throw new Error(`Adaptador no implementado para ${provider}`);
            
            const imageResult = await adapter.fetchImage(category, nsfw, req);
            
            // Si tiene éxito, devolver el DTO normalizado
            return res.status(200).json({
                success: true,
                data: imageResult,
                meta: {
                    timestamp: Date.now(),
                    tried_providers: providersToTry
                }
            });

        } catch (error) {
            console.error(`Error con proveedor ${provider} para categoría ${category}:`, error.message);
            lastError = error.message;
            // Continuar con el siguiente proveedor en el array
            continue;
        }
    }

    // Si salimos del bucle, todos fallaron
    return res.status(502).json({
        success: false,
        error: 'Todos los proveedores fallaron',
        details: lastError,
        meta: {
            timestamp: Date.now(),
            tried_providers: providersToTry
        }
    });
};
