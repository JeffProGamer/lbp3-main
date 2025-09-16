const express = require('express');
const path = require('path');
const fetch = require('node-fetch');
const NodeCache = require('node-cache');
const cors = require('cors');

const app = express();
const cache = new NodeCache({ stdTTL: 300 }); // Cache for 5 minutes
const PORT = process.env.PORT || 3000;
const API_URL = 'https://your-api.onrender.com'; // REPLACE with your Lighthouse API URL

app.use(cors({ origin: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Proxy API requests with caching for /api/v1/slots
app.all('/api/v1/*', async (req, res) => {
    const endpoint = req.path;
    const cacheKey = `api_${endpoint}`;
    if (endpoint === '/api/v1/slots' && req.method === 'GET') {
        const cached = cache.get(cacheKey);
        if (cached) {
            return res.json(cached);
        }
    }

    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: req.method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': req.headers.authorization || '',
            },
            body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
            timeout: 10000 // 10s timeout
        });
        const data = await response.json();
        if (endpoint === '/api/v1/slots' && req.method === 'GET' && response.ok) {
            cache.set(cacheKey, data);
        }
        res.status(response.status).json(data);
    } catch (error) {
        console.error(`API error at ${endpoint}:`, error.message);
        res.status(503).json({ error: 'Server unavailable or slow' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});