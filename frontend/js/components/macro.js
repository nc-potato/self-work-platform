/**
 * 宏观数据页面
 */
const MacroPage = {
    charts: {},

    async render() {
        const main = document.getElementById('mainContent');
        main.innerHTML = `
            <div class="page-header">
                <h2 class="page-title">🌐 宏观数据</h2>
                <div class="page-actions">
                    <button class="refresh-btn" onclick="MacroPage.load()" title="刷新">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M23 4v6h-6M1 20v-6h6"/>
                            <path d="M3.51 9a9 9 0 0 1 14.85-3.36l4.64 4.36M20.49 15a9 9 0 0 1-14.85 3.36l-4.64-4.36"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div id="macroContent">
                <div class="loading"><div class="spinner"></div> 加载宏观数据...</div>
            </div>
        `;
        await this.load();
    },

    async load() {
        const container = document.getElementById('macroContent');
        if (!container) return;

        try {
            const [gdp, cpi, pmi, moneySupply, shibor, lpr] = await Promise.all([
                API.macro.gdp().catch(() => []),
                API.macro.cpi().catch(() => []),
                API.macro.pmi().catch(() => []),
                API.macro.moneySupply().catch(() => []),
                API.macro.shibor().catch(() => []),
                API.macro.lpr().catch(() => []),
            ]);

            container.innerHTML = `
                <div class="grid-2" style="margin-bottom:20px;">
                    <div class="card">
                        <div class="card-header"><span class="card-title">📈 GDP</span></div>
                        <div class="card-body"><div id="macroGdpChart" class="chart-container-sm"></div></div>
                    </div>
                    <div class="card">
                        <div class="card-header"><span class="card-title">📊 CPI</span></div>
                        <div class="card-body"><div id="macroCpiChart" class="chart-container-sm"></div></div>
                    </div>
                </div>
                <div class="grid-2" style="margin-bottom:20px;">
                    <div class="card">
                        <div class="card-header"><span class="card-title">🏭 PMI</span></div>
                        <div class="card-body"><div id="macroPmiChart" class="chart-container-sm"></div></div>
                    </div>
                    <div class="card">
                        <div class="card-header"><span class="card-title">💰 M2 同比</span></div>
                        <div class="card-body"><div id="macroM2Chart" class="chart-container-sm"></div></div>
                    </div>
                </div>
                <div class="grid-2">
                    <div class="card">
                        <div class="card-header"><span class="card-title">🏦 Shibor 利率</span></div>
                        <div class="card-body" id="macroShiborData">${this.renderShibor(shibor)}</div>
                    </div>
                    <div class="card">
                        <div class="card-header"><span class="card-title">📋 LPR 利率</span></div>
                        <div class="card-body" id="macroLprData">${this.renderLpr(lpr)}</div>
                    </div>
                </div>
            `;

            this.renderGdpChart(gdp);
            this.renderCpiChart(cpi);
            this.renderPmiChart(pmi);
            this.renderM2Chart(moneySupply);

        } catch (err) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">⚠️</div>
                    <div class="empty-text">加载失败: ${err.message}</div>
                    <button class="btn btn-primary mt-4" onclick="MacroPage.load()">重试</button>
                </div>
            `;
        }
    },

    renderShibor(data) {
        if (!data?.length) return '<div class="text-muted">暂无数据</div>';
        const latest = data[data.length - 1] || {};
        const rates = [
            ['隔夜', latest['O/N-定价'] || '--'],
            ['1周', latest['1W-定价'] || '--'],
            ['2周', latest['2W-定价'] || '--'],
            ['1月', latest['1M-定价'] || '--'],
            ['3月', latest['3M-定价'] || '--'],
            ['6月', latest['6M-定价'] || '--'],
            ['9月', latest['9M-定价'] || '--'],
            ['1年', latest['1Y-定价'] || '--'],
        ];
        return `
            <div class="stat-grid">
                ${rates.map(([label, value]) => `
                    <div class="stat-card">
                        <div class="stat-label">${label}</div>
                        <div class="stat-value" style="font-size:18px;">${value}</div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    renderLpr(data) {
        if (!data?.length) return '<div class="text-muted">暂无数据</div>';
        const latest = data[data.length - 1] || {};
        const items = [
            ['1年期 LPR', latest['LPR1Y'] || '--'],
            ['5年期以上 LPR', latest['LPR5Y'] || '--'],
        ];
        return `
            <div class="stat-grid" style="grid-template-columns:1fr 1fr;">
                ${items.map(([label, value]) => `
                    <div class="stat-card">
                        <div class="stat-label">${label}</div>
                        <div class="stat-value" style="font-size:20px;">${value}%</div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    renderGdpChart(data) {
        if (!data?.length) return;
        const reversed = [...data].reverse().slice(-20);
        const years = reversed.map(d => d['日期'] || d['年'] || '');
        const values = reversed.map(d => parseFloat(d['今值'] || d['GDP'] || 0));
        this.charts.gdp = ChartLib.createLine('macroGdpChart', years, values, {
            name: 'GDP',
            color: '#3b82f6',
            area: true,
        });
    },

    renderCpiChart(data) {
        if (!data?.length) return;
        const reversed = [...data].reverse().slice(-36);
        const labels = reversed.map(d => d['日期'] || d['月份'] || '');
        const values = reversed.map(d => parseFloat(d['今值'] || d['当月'] || 0));
        this.charts.cpi = ChartLib.createBar('macroCpiChart', labels, values, {
            yName: '同比 (%)',
            colors: values.map(v => v >= 0 ? '#ef4444' : '#22c55e'),
        });
    },

    renderPmiChart(data) {
        if (!data?.length) return;
        const reversed = [...data].reverse().slice(-24);
        const labels = reversed.map(d => d['月份'] || d['日期'] || '');
        const values = reversed.map(d => parseFloat(d['制造业-指数'] || d['制造业PMI'] || 0));
        this.charts.pmi = ChartLib.createLine('macroPmiChart', labels, values, {
            name: 'PMI',
            color: '#a855f7',
            markLine: {
                silent: true,
                data: [{ yAxis: 50, label: { formatter: '枯荣线 50', color: '#64748b', fontSize: 10 },
                         lineStyle: { color: '#ef4444', type: 'dashed' } }],
            },
        });
    },

    renderM2Chart(data) {
        if (!data?.length) return;
        const reversed = [...data].reverse().slice(-24);
        const labels = reversed.map(d => d['月份'] || d['日期'] || '');
        const m2 = reversed.map(d => parseFloat(d['货币和准货币(M2)-同比增长'] || d['M2同比'] || 0));
        this.charts.m2 = ChartLib.createLine('macroM2Chart', labels, m2, {
            name: 'M2 同比 (%)',
            color: '#06b6d4',
            area: true,
        });
    },

    destroy() {
        Object.values(this.charts).forEach(c => c?.dispose?.());
        this.charts = {};
    },
};
