// api/v1/categories.js
const registry = require('../_lib/registry');

module.exports = (req, res) => {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    res.status(200).json({
        success: true,
        version: "1.0",
        data: registry.categories,
        providers: registry.providers
    });
};
