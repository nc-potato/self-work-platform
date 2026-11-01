"""应用配置"""

import os

# 项目根目录
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# 数据存储路径
DATA_DIR = os.path.join(BASE_DIR, "data")
WATCHLIST_FILE = os.path.join(DATA_DIR, "watchlist.json")
CACHE_DIR = os.path.join(DATA_DIR, "cache")

# 数据刷新配置
REFRESH_INTERVAL = 30  # 前端推荐刷新间隔（秒）
CACHE_TTL = 15  # 后端缓存过期时间（秒）

# 服务配置
HOST = "0.0.0.0"
PORT = 8899

# 默认自选股列表（股票代码）
DEFAULT_WATCHLIST = [
    {"code": "000001", "name": "平安银行", "market": "SZ"},
    {"code": "600519", "name": "贵州茅台", "market": "SH"},
    {"code": "300750", "name": "宁德时代", "market": "SZ"},
]
