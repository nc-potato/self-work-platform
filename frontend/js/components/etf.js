/**
 * ETF 跟踪页面
 */
const EtfPage = {
    allData: null,

    async render() {
        const main = document.getElementById('mainContent');
        main.innerHTML = `
            <div class="page-header">
                <h2 class="page-title">📦 ETF 跟踪</h2>
                <div class="page-actions">
                    <button class="refresh-btn" onclick="EtfPage.load()" title="刷新">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M23 4v6h-6M1 20v-6h6"/>
                            <path d="M3.51 9a9 9 0 0 1 14.85-3.36l4.64 4.36M20.49 15a9 9 0 0 1-14.85 3.36l-4.64-4.36"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div style="margin-bottom:16px;">
                <input type="text" class="search-input" placeholder="搜索 ETF 代码或名称..."
                       oninput="EtfPage.filter(this.value)" style="max-width:400px;">
            </div>
            <div id="etfContent">
                <div class="loading"><div class="spinner"></div> 加载 ETF 数据...</div>
            </div>
        `;
        await this.load();
    },

    async load() {
        const container = document.getElementById('etfContent');
        if (!container) return;

        try {
            const data = await API.etf.hot();
            this.allData = data || [];
            this.renderTable(this.allData, container);
        } catch (err) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">⚠️</div>
                    <div class="empty-text">加载失败: ${err.message}</div>
                    <button class="btn btn-primary mt-4" onclick="EtfPage.load()">重试</button>
                </div>
            `;
        }
    },

    renderTable(data, container) {
        if (!container) container = document.getElementById('etfContent');
        if (!container) return;

        if (!data?.length) {
            container.innerHTML = '<div class="empty-state"><div class="empty-text">暂无数据</div></div>';
            return;
        }

        container.innerHTML = `
            <div class="card">
                <div class="card-body">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>代码</th>
                                <th>名称</th>
                                <th>类型</th>
                                <th>最新价</th>
                                <th>涨跌幅</th>
                                <th>成交额</th>
                                <th>换手率</th>
                                <th>折溢价率</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.map(e => {
                                const change = parseFloat(e['涨跌幅'] || 0);
                                const amount = e['成交额'] || 0;
                                const amountStr = amount ? (amount / 100000000).toFixed(2) + '亿' : '--';
                                return `
                                    <tr>
                                        <td><span class="tag tag-blue">${e['代码'] || '--'}</span></td>
                                        <td><strong>${e['名称'] || '--'}</strong></td>
                                        <td><span class="tag tag-purple">${e.type || 'ETF'}</span></td>
                                        <td class="${change >= 0 ? 'price-up' : 'price-down'}">${e['最新价'] || '--'}</td>
                                        <td><span class="change-badge ${change >= 0 ? 'up' : 'down'}">${change >= 0 ? '+' : ''}${change.toFixed(2)}%</span></td>
                                        <td class="font-mono">${amountStr}</td>
                                        <td>${e['换手率'] || '--'}</td>
                                        <td>${e['折溢价率'] != null ? e['折溢价率'] : '--'}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    filter(keyword) {
        if (!this.allData) return;
        if (!keyword.trim()) { this.renderTable(this.allData); return; }
        const kw = keyword.trim().toUpperCase();
        const filtered = this.allData.filter(e =>
            (e['代码'] || '').includes(kw) ||
            (e['名称'] || '').toUpperCase().includes(kw)
        );
        this.renderTable(filtered);
    },

    destroy() { this.allData = null; },
};
