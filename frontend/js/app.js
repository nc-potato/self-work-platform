/**
 * 自选股工作台 - 主应用控制器
 * 负责页面路由、全局状态管理、自动刷新调度
 */

const App = (() => {
    // ── 状态 ──
    let currentPage = 'overview';
    let currentPageInstance = null;
    let refreshTimers = {
        overview: null,
        stocks: null,
        etf: null,
        futures: null,
        macro: null,
    };
    // 全局刷新定时器（统一轮询器）
    let globalRefreshTimer = null;

    // ── 页面映射 ──
    const PAGES = {
        overview: { instance: null, component: OverviewPage, label: '市场概览' },
        stocks: { instance: null, component: StocksPage, label: '自选股票' },
        etf: { instance: null, component: EtfPage, label: 'ETF 跟踪' },
        futures: { instance: null, component: FuturesPage, label: '期货行情' },
        macro: { instance: null, component: MacroPage, label: '宏观数据' },
        settings: { instance: null, component: SettingsPage, label: '设置' },
    };

    // ── 路由切换 ──
    async function navigate(pageName) {
        if (!PAGES[pageName]) return;

        // 销毁当前页面
        if (currentPageInstance && currentPageInstance.destroy) {
            currentPageInstance.destroy();
        }

        // 更新导航高亮
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        const navEl = document.querySelector(`.nav-item[data-page="${pageName}"]`);
        if (navEl) navEl.classList.add('active');

        // 更新状态
        currentPage = pageName;
        currentPageInstance = PAGES[pageName].component;

        // 渲染新页面
        await currentPageInstance.render();

        // 调度自动刷新
        scheduleRefresh(pageName);

        // 更新页面标题
        document.title = `${PAGES[pageName].label} - 自选股工作台`;
    }

    // ── 自动刷新调度 ──
    function scheduleRefresh(pageName) {
        clearGlobalTimer();

        // 从设置读取刷新间隔
        const saved = localStorage.getItem('swp_settings');
        let interval = 30000; // 默认 30 秒
        if (saved) {
            try {
                const s = JSON.parse(saved);
                if (s.autoRefresh !== false && s.interval) {
                    interval = s.interval * 1000;
                }
                if (s.autoRefresh === false) return; // 自动刷新关闭
            } catch (e) {}
        }

        // 根据页面设置自动刷新
        // 对行情类页面使用全局定时器统一刷新
        if (['overview', 'stocks', 'etf', 'futures'].includes(pageName)) {
            globalRefreshTimer = setInterval(() => {
                if (currentPageInstance && currentPageInstance.load) {
                    currentPageInstance.load();
                }
            }, interval);

            // 更新时间标签
            startTimeUpdates();
        }
    }

    function clearGlobalTimer() {
        if (globalRefreshTimer) {
            clearInterval(globalRefreshTimer);
            globalRefreshTimer = null;
        }
        stopTimeUpdates();
    }

    // ── 更新时间标签 ──
    let timeUpdateTimer = null;

    function startTimeUpdates() {
        stopTimeUpdates();
        timeUpdateTimer = setInterval(() => {
            const badge = document.getElementById('updateBadge');
            if (badge) {
                const now = new Date();
                badge.textContent = `更新: ${now.toLocaleTimeString('zh-CN', { hour12: false })}`;
            }
        }, 5000);
        // 立即更新一次
        const badge = document.getElementById('updateBadge');
        if (badge) {
            badge.textContent = '数据就绪';
        }
    }

    function stopTimeUpdates() {
        if (timeUpdateTimer) {
            clearInterval(timeUpdateTimer);
            timeUpdateTimer = null;
        }
    }

    // ── 设置变化回调 ──
    function updateRefreshSettings(settings) {
        // 重启当前页面的刷新定时器
        clearGlobalTimer();
        if (settings.autoRefresh !== false && ['overview', 'stocks', 'etf', 'futures', 'macro'].includes(currentPage)) {
            const interval = (settings.interval || 30) * 1000;
            globalRefreshTimer = setInterval(() => {
                if (currentPageInstance && currentPageInstance.load) {
                    currentPageInstance.load();
                }
            }, interval);
        }
    }

    // ── 初始化 ──
    async function init() {
        // 导航点击
        document.querySelectorAll('.nav-item').forEach(el => {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                const page = el.dataset.page;
                if (page) navigate(page);
            });
        });

        // 键盘快捷键: Ctrl+K / Cmd+K 打开搜索
        document.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                openSearchModal();
            }
        });

        // 加载首页
        await navigate('overview');
    }

    return {
        init,
        navigate,
        updateRefreshSettings,
        getCurrentPage: () => currentPage,

        // 暴露给全局的搜索函数
        openSearch: () => openSearchModal(),
    };

    // 将 currentPageInView 设为全局可访问
    window.__appState = { getCurrentPage: () => currentPage, getInstance: () => currentPageInstance };
})();

// ── 搜索弹窗逻辑 ──────────────────────────────────────────────────────────

const searchModalState = {
    debounceTimer: null,
};

async function openSearchModal() {
    const modal = document.getElementById('searchModal');
    const input = document.getElementById('searchInput');
    const results = document.getElementById('searchResults');

    if (modal) modal.classList.remove('hidden');
    if (input) {
        input.value = '';
        input.focus();
        // 绑定输入事件
        input.oninput = (e) => onSearchInput(e.target?.value || '');
    }
    if (results) results.innerHTML = '';

    // 清空旧定时器
    if (searchModalState.debounceTimer) {
        clearTimeout(searchModalState.debounceTimer);
    }
}

function closeSearchModal() {
    const modal = document.getElementById('searchModal');
    if (modal) modal.classList.add('hidden');
    if (searchModalState.debounceTimer) {
        clearTimeout(searchModalState.debounceTimer);
    }
}

// 搜索输入事件
function onSearchInput(keyword) {
    if (searchModalState.debounceTimer) {
        clearTimeout(searchModalState.debounceTimer);
    }

    const input = document.getElementById('searchInput');
    const kw = keyword || input?.value.trim() || '';
    const results = document.getElementById('searchResults');

    if (!kw) {
        if (results) results.innerHTML = '';
        return;
    }

    searchModalState.debounceTimer = setTimeout(async () => {
        if (!results) return;
        results.innerHTML = '<div class="loading"><div class="spinner"></div> 搜索中...</div>';

        try {
            const data = await API.stocks.search(kw);
            if (!data?.length) {
                results.innerHTML = '<div class="empty-state"><div class="empty-text">未找到匹配的股票</div></div>';
                return;
            }

            results.innerHTML = data.map(s => `
                <div class="search-result-item" onclick="addToWatchlist('${s.code}', '${s.name}', '${s.market}')">
                    <div class="stock-info">
                        <span class="stock-code">${s.code}</span>
                        <span class="stock-name">${s.name}</span>
                        <span class="stock-market">${s.market}</span>
                    </div>
                    <div class="${parseFloat(s.change_pct) >= 0 ? 'price-up' : 'price-down'}">
                        ${s.price || '--'}
                        <span class="change-badge ${parseFloat(s.change_pct) >= 0 ? 'up' : 'down'}" style="margin-left:6px;">
                            ${s.change_pct || '0.00'}%
                        </span>
                    </div>
                </div>
            `).join('');
        } catch (err) {
            results.innerHTML = `<div class="empty-state"><div class="empty-text">搜索失败: ${err.message}</div></div>`;
        }
    }, 300);
}

async function addToWatchlist(code, name, market) {
    try {
        await API.watchlist.add({ code, name, market });
        closeSearchModal();

        // 如果在自选股页面，刷新列表
        const state = window.__appState || {};
        if (state.getCurrentPage?.() === 'stocks' && state.getInstance?.()?.load) {
            state.getInstance().load();
        }
    } catch (err) {
        alert(err.message);
    }
}

// 点击遮罩关闭弹窗
document.addEventListener('click', (e) => {
    const modal = document.getElementById('searchModal');
    if (modal && !modal.classList.contains('hidden') && e.target === modal) {
        closeSearchModal();
    }
});

// ── DOM 就绪后启动 ──
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
