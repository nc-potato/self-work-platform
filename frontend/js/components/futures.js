/**
 * 期货行情页面（当前数据源不可用）
 */
const FuturesPage = {
    async render() {
        const main = document.getElementById('mainContent');
        main.innerHTML = `
            <div class="page-header">
                <h2 class="page-title">🛢️ 期货行情</h2>
            </div>
            <div class="card">
                <div class="card-body">
                    <div class="empty-state">
                        <div class="empty-icon">🔄</div>
                        <div class="empty-text">期货数据接口暂时不可用</div>
                        <div class="empty-text text-sm text-muted mt-2">
                            当前网络环境下，东方财富 push2 服务器被拦截<br>
                            待网络环境变更后自动恢复
                        </div>
                    </div>
                </div>
            </div>
        `;
    },
    destroy() {},
};
