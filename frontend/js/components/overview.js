/**
 * 市场概览页面
 */
const OverviewPage = {
    charts: {},

    async render() {
        const main = document.getElementById('mainContent');
        main.innerHTML = `
            <div class="page-header">
                <h2 class="page-title">📈 市场概览</h2>
                <div class="page-actions">
                    <button class="refresh-btn" onclick="OverviewPage.load()" title="刷新">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M23 4v6h-6M1 20v-6h6"/>
                            <path d="M3.51 9a9 9 0 0 1 14.85-3.36l4.64 4.36M20.49 15a9 9 0 0 1-14.85 3.36l-4.64-4.36"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div id="overviewContent">
                <div class="loading"><div class="spinner"></div> 加载市场数据...</div>
            </div>
        `;
        await this.load();
    },

    async load() {
        const container = document.getElementById('overviewContent');
        if (!container) return;

        try {
            // 先加载快的部分（指数 + 涨跌统计），ETF 异步加载
            const overview = await API.macro.overview().catch(() => ({}));

            const indices = overview.indices || [];
            const limitUp = overview.limit_up ?? '--';
            const limitDown = overview.limit_down ?? '--';

            const sectors = overview.sectors || { inflow: [], outflow: [] };
            const sectorInflow = sectors.inflow || [];
            const sectorOutflow = sectors.outflow || [];

            container.innerHTML = `
                <div class="grid-4" style="margin-bottom: 20px;">
                    ${indices.map(idx => {
                        const close = idx['close'] || '--';
                        const open = idx['open'] || 0;
                        const change = close !== '--' && open ? (((close - open) / open) * 100).toFixed(2) : '--';
                        const name = idx['name'] || '指数';
                        return `
                            <div class="stat-card">
                                <div class="stat-label">${name}</div>
                                <div class="stat-value ${change > 0 ? 'price-up' : change < 0 ? 'price-down' : ''}">
                                    ${typeof close === 'number' ? close.toFixed(2) : close}
                                </div>
                                <div class="stat-change ${change > 0 ? 'price-up' : change < 0 ? 'price-down' : ''}">
                                    ${change}%
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>

                <div class="grid-2" style="margin-bottom:20px;">
                    <div class="card">
                        <div class="card-header"><span class="card-title">📊 今日市场</span></div>
                        <div class="card-body">
                            <div class="grid-2" style="gap:12px;">
                                <div class="stat-card">
                                    <div class="stat-label">涨停</div>
                                    <div class="stat-value price-up">${limitUp}</div>
                                </div>
                                <div class="stat-card">
                                    <div class="stat-label">跌停</div>
                                    <div class="stat-value price-down">${limitDown}</div>
                                </div>
                            </div>
                            <div class="mt-4">
                                <div id="overviewMarketChart" class="chart-container-sm"></div>
                            </div>
                        </div>
                    </div>

                    <div class="card">
                        <div class="card-header"><span class="card-title">🔥 热门 ETF（成交额前10）</span></div>
                        <div class="card-body" id="overviewEtfBody">
                            <div class="loading"><div class="spinner"></div> 加载中...</div>
                        </div>
                    </div>
                </div>

                ${this.renderSectors(sectorInflow, sectorOutflow)}
            `;

            // 饼图
            setTimeout(() => {
                this.charts.market = ChartLib.createPie('overviewMarketChart', [
                    { name: '上涨', value: Math.max(1, Number(limitUp) * 5 || 1500) },
                    { name: '下跌', value: Math.max(1, Number(limitDown) * 3 || 800) },
                    { name: '平盘', value: 400 },
                ], { colors: ['#ef4444', '#22c55e', '#64748b'] });
            }, 100);

            // 异步加载 ETF（可能较慢）
            API.etf.hot().then(data => {
                const body = document.getElementById('overviewEtfBody');
                if (!body) return;
                const etfs = data || [];
                if (!etfs.length) {
                    body.innerHTML = '<div class="empty-state"><div class="empty-text">暂无数据</div></div>';
                    return;
                }
                body.innerHTML = `
                    <table class="data-table">
                        <thead><tr><th>代码</th><th>名称</th><th>最新价</th><th>涨跌幅</th><th>成交额</th></tr></thead>
                        <tbody>
                            ${etfs.slice(0, 10).map(e => {
                                const chg = parseFloat(e['涨跌幅'] || 0);
                                const amt = e['成交额'] || 0;
                                return `<tr>
                                    <td><span class="tag tag-blue">${e['代码'] || '--'}</span></td>
                                    <td>${e['名称'] || '--'}</td>
                                    <td class="${chg >= 0 ? 'price-up' : 'price-down'}">${e['最新价'] || '--'}</td>
                                    <td><span class="change-badge ${chg >= 0 ? 'up' : 'down'}">${chg >= 0 ? '+' : ''}${chg.toFixed(2)}%</span></td>
                                    <td class="font-mono">${amt ? (amt / 1e8).toFixed(2) + '亿' : '--'}</td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                `;
            }).catch(() => {
                const body = document.getElementById('overviewEtfBody');
                if (body) body.innerHTML = '<div class="text-muted text-sm">ETF 数据加载失败</div>';
            });

        } catch (err) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">⚠️</div>
                    <div class="empty-text">加载失败: ${err.message}</div>
                    <button class="btn btn-primary mt-4" onclick="OverviewPage.load()">重试</button>
                </div>
            `;
        }
    },

    renderSectors(inflow, outflow) {
        function cardHtml(items, label, cls) {
            if (!items.length) return '<div class="text-muted text-sm">暂无数据</div>';
            return items.map(s => {
                const amt = (parseFloat(s['主力净流入'] || 0) / 1e8).toFixed(2);
                const chg = parseFloat(s['涨跌幅'] || 0);
                const chgCls = chg >= 0 ? 'up' : 'down';
                const dir = cls === 'in' ? '+' : '';
                return '<div class="sector-card" style="margin-bottom:6px;">'
                    + '<span class="sector-name">' + (s['名称'] || '') + '</span>'
                    + '<span>'
                    + '<span class="sector-change ' + (cls === 'in' ? 'price-up' : 'price-down') + '">' + dir + amt + '亿</span>'
                    + '<span class="change-badge ' + chgCls + '" style="margin-left:6px;">'
                    + (chg >= 0 ? '+' : '') + chg.toFixed(2) + '%</span>'
                    + '</span></div>';
            }).join('');
        }
        return '<div class="grid-2" style="margin-bottom:20px;">'
            + '<div class="card"><div class="card-header"><span class="card-title">💰 主力资金流入板块</span></div>'
            + '<div class="card-body">' + cardHtml(inflow, 'in') + '</div></div>'
            + '<div class="card"><div class="card-header"><span class="card-title">💸 主力资金流出板块</span></div>'
            + '<div class="card-body">' + cardHtml(outflow, 'out') + '</div></div>'
            + '</div>';
    },

    destroy() {
        Object.values(this.charts).forEach(c => c?.dispose?.());
        this.charts = {};
    },
};
