# 📊 自选股工作台

个人股票分析工作台，基于 **akshare** 数据源，提供自选股管理、ETF 跟踪、期货行情、宏观数据等功能。

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | Python + FastAPI |
| 前端 | HTML + CSS + JavaScript (SPA) |
| 图表 | ECharts |
| 数据源 | akshare (东方财富接口) |
| 数据存储 | JSON 文件 |

## 功能

- **📈 市场概览** — 主要指数、涨跌统计、板块轮动、热门ETF
- **💎 自选股票** — 自由添加/删除股票，实时行情，K线图表
- **📦 ETF 跟踪** — 全市场 ETF 行情，按成交额排序
- **🛢️ 期货行情** — 国内期货 + 外盘期货
- **🌐 宏观数据** — GDP、CPI、PMI、M2、Shibor、LPR
- **⚙️ 设置** — 自动刷新开关、刷新间隔

## 快速启动

```bash
# 1. 安装依赖
cd backend
pip install -r requirements.txt

# 2. 启动服务
cd ..
bash run.sh
```

或者手动启动：

```bash
# 终端1: 启动后端
cd backend
python3 -m uvicorn main:app --host 0.0.0.0 --port 8899 --reload

# 浏览器打开: http://localhost:8899
# 或者直接打开 frontend/index.html
```

## 项目结构

```
self-work-platform/
├── backend/
│   ├── main.py              # FastAPI 入口
│   ├── config.py            # 配置
│   ├── requirements.txt     # Python 依赖
│   ├── routers/             # API 路由
│   │   ├── stocks.py        # 股票
│   │   ├── etf.py           # ETF
│   │   ├── futures.py       # 期货
│   │   ├── macro.py         # 宏观数据
│   │   └── watchlist.py     # 自选股管理
│   ├── services/
│   │   ├── akshare_service.py  # akshare 数据封装
│   │   └── data_service.py     # 缓存服务
│   └── data/
│       └── watchlist.json   # 自选股存储
├── frontend/
│   ├── index.html           # 主页面
│   ├── css/style.css        # 样式
│   └── js/
│       ├── api.js           # API 客户端
│       ├── app.js           # 应用控制器
│       ├── lib/chart.js     # 图表工具
│       └── components/      # 页面组件
├── run.sh                   # 启动脚本
└── README.md
```

## 快捷键

- `Ctrl+K` / `Cmd+K` — 搜索股票/添加自选

## 配置

- 自选股保存在 `backend/data/watchlist.json`
- 刷新间隔可在「设置」页面调整
- 默认自选股：平安银行、贵州茅台、宁德时代
