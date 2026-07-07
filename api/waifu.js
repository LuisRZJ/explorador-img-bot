// /api/waifu.js — Vercel Serverless Function (proxy para waifu.im)
// Actúa como intermediario para evitar el bloqueo CORS/Cloudflare Challenge
// que ocurre cuando el browser hace fetch() directo a api.waifu.im

export default async function handler(req, res) {
    // Solo permitir GET
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { included_tags = 'waifu', is_nsfw = 'false' } = req.query;

    // Validar el parámetro is_nsfw para evitar valores inesperados (PascalCase requerido por API v7)
    const nsfwValue = is_nsfw === 'true' ? 'True' : 'False';

    const targetUrl = `https://api.waifu.im/images?IncludedTags=${encodeURIComponent(included_tags)}&IsNsfw=${nsfwValue}`;

    try {
        const response = await fetch(targetUrl, {
            headers: {
                // Headers que identifican la petición como legítima
                'User-Agent': 'NekoExplorer/1.0 (Vercel Serverless; contact via GitHub)',
                'Accept': 'application/json',
            }
        });

        if (!response.ok) {
            return res.status(response.status).json({
                error: `waifu.im respondió con error: ${response.status}`
            });
        }

        const data = await response.json();

        // Cabeceras de respuesta: permitir caché corta y CORS para el frontend
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=30');

        return res.status(200).json(data);

    } catch (err) {
        console.error('[waifu-proxy] Error al contactar waifu.im:', err);
        return res.status(502).json({
            error: 'No se pudo conectar con waifu.im. Intenta de nuevo.'
        });
    }
}
