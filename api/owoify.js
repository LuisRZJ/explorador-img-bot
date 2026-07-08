// /api/owoify.js — Vercel Serverless Function para owoificar texto mediante nekos.life

export default async function handler(req, res) {
    // Cabeceras CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { text } = req.query;
    if (!text || !text.trim()) {
        return res.status(400).json({ error: 'Missing text parameter' });
    }

    try {
        const url = `https://nekos.life/api/v2/owoify?text=${encodeURIComponent(text.trim())}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Nekos API responded with status ${response.status}`);
        }

        const data = await response.json();
        return res.status(200).json({ owo: data.owo || text });
    } catch (err) {
        console.error('[Owoify] Error al llamar a la API externa:', err);
        return res.status(502).json({ error: 'Error al procesar el texto con la API externa.', details: err.message });
    }
}
