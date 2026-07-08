// /api/translate.js — Vercel Serverless Function para traducir usando modelos Gemma de Google AI Studio
// Utiliza gemma-4-31b-it como modelo principal, con fallbacks a gemma-2-27b-it y gemma-2-9b-it para asegurar disponibilidad.

export default async function handler(req, res) {
    // Cabeceras CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Manejo de petición preflight OPTIONS
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Solo permitir GET
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { text } = req.query;
    if (!text || !text.trim()) {
        return res.status(400).json({ error: 'Missing text parameter' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('[Traductor] Error: GEMINI_API_KEY no configurado en las variables de entorno de Vercel.');
        return res.status(500).json({ error: 'Configuración incompleta: GEMINI_API_KEY ausente.' });
    }

    const prompt = `Traduce el siguiente texto al español manteniendo su tono original (sea informativo, curioso o reflexivo). Responde ÚNICAMENTE con la traducción limpia, sin comillas adicionales al principio o al final, sin introducciones y sin explicaciones:\n\n"${text.trim()}"`;

    const payload = {
        contents: [
            {
                parts: [
                    { text: prompt }
                ]
            }
        ]
    };

    // Cascada de modelos Gemma (del más potente de la capa gratuita a los más eficientes)
    const models = ['gemma-4-31b-it', 'gemma-2-27b-it', 'gemma-2-9b-it'];
    let lastError = null;

    for (const model of models) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const data = await response.json();
                if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
                    let translation = data.candidates[0].content.parts[0].text.trim();
                    
                    // Limpieza opcional de comillas que el modelo pueda haber agregado a pesar del prompt
                    if (translation.startsWith('"') && translation.endsWith('"')) {
                        translation = translation.slice(1, -1).trim();
                    }
                    if (translation.startsWith('«') && translation.endsWith('»')) {
                        translation = translation.slice(1, -1).trim();
                    }

                    console.log(`[Traductor] Éxito al traducir con el modelo: ${model}`);
                    return res.status(200).json({ translation });
                }
            } else {
                const errText = await response.text();
                console.warn(`[Traductor] Intento fallido con ${model} (HTTP ${response.status}): ${errText}`);
                lastError = `HTTP ${response.status}: ${errText}`;
            }
        } catch (err) {
            console.error(`[Traductor] Error al conectar con el modelo ${model}:`, err);
            lastError = err.message || err;
        }
    }

    return res.status(502).json({
        error: 'Todos los intentos de traducción con Gemma fallaron.',
        details: lastError
    });
}
