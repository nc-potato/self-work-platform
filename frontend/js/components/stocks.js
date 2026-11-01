/**
 * 自选股票页面
 */
const StocksPage = {
    charts: {},
    refreshTimer: null,
    selectedCode: null,
    selectedName: null,

    async render() {
        const main = document.getElementById('mainContent');
        main.innerHTML = `
            <div class="page-header">
                <h2 class="page-title">💎 自选股票</h2>
                <div class="page-actions">
                    <button class="btn btn-primary" onclick="openSearchModal()">+ 添加自选</button>
                    <button class="refresh-btn" onclick="StocksPage.load()" title="刷新">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M23 4v6h-6M1 20v-6h6"/>
                            <path d="M3.51 9a9 9 0 0 1 14.85-3.36l4.64 4.36M20.49 15a9 9 0 0 1-14.85 3.36l-4.64-4.36"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="grid-2" style="grid-template-columns: 1fr 1.5fr;">
                <div class="card">
                    <div class="card-header">
                        <span class="card-title">📋 持仓观察</span>
                        <span class="text-muted text-xs" id="stocksUpdateTime"></span>
                    </div>
                    <div class="card-body" id="stocksList">
                        <div class="loading"><div class="spinner"></div> 加载中...</div>
                    </div>
                </div>
                <div class="card">
                    <div class="card-header">
                        <span class="card-title" id="stockDetailTitle">📊 点击股票查看 K 线</span>
                    </div>
                    <div class="card-body">
                        <div id="stockKLine" class="chart-container" style="display:none;"></div>
                        <div id="stockDetailEmpty" class="empty-state">
                            <div class="empty-icon">👆</div>
                            <div class="empty-text">请从左侧选择一只股票</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        await this.load();
    },

    async load() {
        const listEl = document.getElementById('stocksList');
        const timeEl = document.getElementById('stocksUpdateTime');
        if (!listEl) return;

        try {
            const quotes = await API.watchlist.quotes();
            if (timeEl) {
                timeEl.textContent = `更新: ${new Date().toLocaleTimeString('zh-CN', { hour12: false })}`;
            }

            if (!quotes?.length) {
                listEl.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">📭</div>
                        <div class="empty-text">自选股列表为空</div>
                        <div class="empty-text text-sm mt-2">点击上方"添加自选"搜索股票</div>
                    </div>
                `;
                return;
            }

            listEl.innerHTML = `
                <table class="data-table">
                    <thead>
                        <tr><th>代码</th><th>名称</th><th>最新价</th><th>涨跌幅</th><th>操作</th></tr>
                    </thead>
                    <tbody>
                        ${quotes.map(s => {
                            const code = s['代码'];
                            const name = s['名称'];
                            const price = s['最新价'];
                            const change = parseFloat(s['涨跌幅'] || 0);
                            return `
                                <tr style="cursor:pointer;" onclick="StocksPage.selectStock('${code}', '${name}')">
                                    <td><span class="tag tag-blue">${code}</span></td>
                                    <td><strong>${name}</strong></td>
                                    <td class="${change >= 0 ? 'price-up' : 'price-down'}"><strong>${price || '--'}</strong></td>
                                    <td><span class="change-badge ${change >= 0 ? 'up' : 'down'}">${change >= 0 ? '+' : ''}${change.toFixed(2)}%</span></td>
                                    <td><button class="btn btn-sm btn-danger" onclick="event.stopPropagation(); StocksPage.remove('${code}')">✕</button></td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            `;

            if (!this.selectedCode && quotes[0]) {
                this.selectStock(quotes[0]['代码'], quotes[0]['名称']);
            }
        } catch (err) {
            listEl.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-text">加载失败: ${err.message}</div></div>`;
        }
    },

    async selectStock(code, name) {
        this.selectedCode = code;
        this.selectedName = name;

        const title = document.getElementById('stockDetailTitle');
        const empty = document.getElementById('stockDetailEmpty');
        const chartEl = document.getElementById('stockKLine');

        if (title) title.textContent = `📊 ${name} (${code})`;
        if (empty) empty.style.display = 'none';
        if (chartEl) { chartEl.style.display = 'block'; chartEl.innerHTML = '<div class="loading"><div class="spinner"></div> 加载K线...</div>'; }

        try {
            const histData = await API.stocks.history(code, 'daily');
            if (histData?.length) {
                ChartLib.dispose('stockKLine');
                this.charts.kline = ChartLib.createKLine('stockKLine', histData.slice(-120));
            } else {
                if (chartEl) chartEl.innerHTML = '<div class="empty-state"><div class="empty-text">暂无K线数据</div></div>';
            }
        } catch (err) {
            if (chartEl) chartEl.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-text">K线加载失败</div></div>`;
        }
    },

    async remove(code) {
        try {
            await API.watchlist.remove(code);
            if (this.selectedCode === code) {
                this.selectedCode = null;
                ChartLib.dispose('stockKLine');
                document.getElementById('stockKLine').style.display = 'none';
                document.getElementById('stockDetailEmpty').style.display = 'block';
                document.getElementById('stockDetailTitle').textContent = '📊 点击股票查看 K 线';
            }
            await this.load();
        } catch (err) {
            alert('移除失败: ' + err.message);
        }
    },

    startAutoRefresh() {
        this.stopAutoRefresh();
        this.refreshTimer = setInterval(() => this.load(), 30000);
    },
    stopAutoRefresh() {
        if (this.refreshTimer) { clearInterval(this.refreshTimer); this.refreshTimer = null; }
    },

    destroy() {
        this.stopAutoRefresh();
        Object.values(this.charts).forEach(c => c?.dispose?.());
        this.charts = {};
        this.selectedCode = null;
    },
};
