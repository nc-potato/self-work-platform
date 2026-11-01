/**
 * 设置页面
 */
const SettingsPage = {
    async render() {
        const main = document.getElementById('mainContent');
        main.innerHTML = `
            <div class="page-header">
                <h2 class="page-title">⚙️ 设置</h2>
            </div>
            <div class="card" style="max-width: 600px;">
                <div class="card-body">
                    <div class="setting-group">
                        <h3>数据刷新</h3>
                        <div class="setting-row">
                            <div>
                                <div class="setting-label">自动刷新</div>
                                <div class="setting-desc">定期刷新实时行情数据</div>
                            </div>
                            <label class="toggle">
                                <input type="checkbox" id="autoRefreshToggle" checked onchange="SettingsPage.toggleRefresh()">
                                <span class="slider"></span>
                            </label>
                        </div>
                        <div class="setting-row">
                            <div>
                                <div class="setting-label">刷新间隔</div>
                                <div class="setting-desc">数据自动刷新频率</div>
                            </div>
                            <select class="interval-select" id="refreshIntervalSelect" onchange="SettingsPage.changeInterval()">
                                <option value="15">15 秒</option>
                                <option value="30" selected>30 秒</option>
                                <option value="60">1 分钟</option>
                                <option value="120">2 分钟</option>
                                <option value="300">5 分钟</option>
                            </select>
                        </div>
                    </div>

                    <div class="setting-group">
                        <h3>关于</h3>
                        <div class="setting-row">
                            <div>
                                <div class="setting-label">自选股工作台</div>
                                <div class="setting-desc">基于 akshare 的个人股票分析平台</div>
                            </div>
                            <span class="text-muted text-sm">v1.0.0</span>
                        </div>
                        <div class="setting-row">
                            <div>
                                <div class="setting-label">数据来源</div>
                                <div class="setting-desc">akshare 东方财富数据接口</div>
                            </div>
                            <span class="text-muted text-sm">实时</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // 加载保存的设置
        this.loadSettings();
    },

    loadSettings() {
        const saved = localStorage.getItem('swp_settings');
        if (saved) {
            try {
                const s = JSON.parse(saved);
                const toggle = document.getElementById('autoRefreshToggle');
                const select = document.getElementById('refreshIntervalSelect');
                if (toggle) toggle.checked = s.autoRefresh !== false;
                if (select && s.interval) select.value = String(s.interval);
            } catch (e) {}
        }
    },

    saveSettings() {
        const toggle = document.getElementById('autoRefreshToggle');
        const select = document.getElementById('refreshIntervalSelect');
        const settings = {
            autoRefresh: toggle ? toggle.checked : true,
            interval: select ? parseInt(select.value) : 30,
        };
        localStorage.setItem('swp_settings', JSON.stringify(settings));

        // 通知 app 更新刷新设置
        if (typeof App !== 'undefined' && App.updateRefreshSettings) {
            App.updateRefreshSettings(settings);
        }
    },

    toggleRefresh() {
        this.saveSettings();
    },

    changeInterval() {
        this.saveSettings();
    },

    destroy() {},
};
