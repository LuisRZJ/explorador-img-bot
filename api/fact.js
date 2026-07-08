// /api/fact.js — Vercel Serverless Function para obtener y traducir un dato curioso usando Gemma

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
        // 1. Obtener dato curioso original en inglés
        const response = await fetch('https://nekos.life/api/v2/fact');
        if (!response.ok) {
            throw new Error(`Nekos API responded with status ${response.status}`);
        }
        const data = await response.json();
        const englishFact = data.fact;

        if (!englishFact) {
            throw new Error('Dato curioso vacío de la API externa');
        }

        // 2. Traducir al español usando Gemma
        const spanishFact = await translateText(englishFact);

        return res.status(200).json({ fact: spanishFact });
    } catch (err) {
        console.error('[Fact] Error en el flujo del dato curioso:', err);
        return res.status(502).json({
            error: 'Error al obtener o traducir el dato curioso.',
            details: err.message || err
        });
    }
}
