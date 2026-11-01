/**
 * API 客户端
 */
const API = (() => {
    const BASE = '';  // same origin

    async function request(method, path, params = null, body = null) {
        const url = new URL(BASE + path, window.location.origin);
        if (params) {
            Object.entries(params).forEach(([k, v]) => {
                if (v !== null && v !== undefined) url.searchParams.set(k, v);
            });
        }

        const opts = {
            method,
            headers: { 'Accept': 'application/json' },
        };
        if (body) {
            opts.headers['Content-Type'] = 'application/json';
            opts.body = JSON.stringify(body);
        }

        try {
            const res = await fetch(url.toString(), opts);
            if (!res.ok) {
                const err = await res.json().catch(() => ({ detail: res.statusText }));
                throw new Error(err.detail || `HTTP ${res.status}`);
            }
            const json = await res.json();
            if (json.code !== 0) {
                throw new Error(json.message || '请求失败');
            }
            return json.data;
        } catch (err) {
            console.error(`[API] ${method} ${path} 失败:`, err);
            throw err;
        }
    }

    function get(path, params) { return request('GET', path, params); }
    function post(path, body) { return request('POST', path, null, body); }

    return {
        // ── 健康检查 ──
        health: () => get('/api/health'),

        // ── 股票 ──
        stocks: {
            spot: () => get('/api/stocks/spot'),
            spotByCodes: (codes) => get('/api/stocks/spot/list', { codes: codes.join(',') }),
            history: (code, period, start, end) =>
                get('/api/stocks/history', { code, period, start, end }),
            search: (keyword) => get('/api/stocks/search', { keyword }),
            limitUp: () => get('/api/stocks/limit-up'),
            moneyFlow: (code) => get('/api/stocks/money-flow', { code }),
        },

        // ── ETF ──
        etf: {
            spot: () => get('/api/etf/spot'),
            hot: () => get('/api/etf/hot'),
        },

        // ── 期货 ──
        futures: {
            spot: () => get('/api/futures/spot'),
            foreign: () => get('/api/futures/foreign'),
        },

        // ── 宏观 ──
        macro: {
            overview: () => get('/api/macro/overview'),
            indices: () => get('/api/macro/indices'),
            gdp: () => get('/api/macro/gdp'),
            cpi: () => get('/api/macro/cpi'),
            pmi: () => get('/api/macro/pmi'),
            moneySupply: () => get('/api/macro/money-supply'),
            shibor: () => get('/api/macro/shibor'),
            lpr: () => get('/api/macro/lpr'),
            exchangeRate: () => get('/api/macro/exchange-rate'),
        },

        // ── 自选股 ──
        watchlist: {
            list: () => get('/api/watchlist/'),
            quotes: () => get('/api/watchlist/quotes'),
            add: (item) => post('/api/watchlist/add', item),
            remove: (code) => post(`/api/watchlist/remove?code=${encodeURIComponent(code)}`),
            reorder: (codes) => post('/api/watchlist/reorder', codes),
        },
    };
})();
