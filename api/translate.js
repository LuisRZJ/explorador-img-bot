// /api/translate.js — Vercel Serverless Function para traducir usando modelos Gemma de Google AI Studio
// Utiliza el módulo compartido _translator.js

import { translateText } from './_translator.js';

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

    try {
        const translation = await translateText(text);
        return res.status(200).json({ translation });
    } catch (err) {
        console.error('[Traductor] Error:', err);
        return res.status(502).json({
            error: 'La traducción falló.',
            details: err.message || err
        });
    }
}
