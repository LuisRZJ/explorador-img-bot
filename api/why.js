// /api/why.js — Vercel Serverless Function para obtener y traducir una pregunta de reflexión usando Gemma

import { translateText } from './_translator.js';

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

    try {
        // 1. Obtener frase original en inglés
        const response = await fetch('https://nekos.life/api/v2/why');
        if (!response.ok) {
            throw new Error(`Nekos API responded with status ${response.status}`);
        }
        const data = await response.json();
        const englishWhy = data.why;

        if (!englishWhy) {
            throw new Error('Frase vacía de la API externa');
        }

        // 2. Traducir al español usando Gemma
        const spanishWhy = await translateText(englishWhy);

        return res.status(200).json({ why: spanishWhy });
    } catch (err) {
        console.error('[Why] Error en el flujo de la pregunta reflexiva:', err);
        return res.status(502).json({
            error: 'Error al obtener o traducir la pregunta reflexiva.',
            details: err.message || err
        });
    }
}
