"""
自选股工作台 - FastAPI 后端入口
"""

import os
import sys
import math
import json
import logging
from typing import Any

# 确保 backend 目录在 Python 路径中
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
import uvicorn

from config import HOST, PORT
from routers import stocks, etf, futures, macro, watchlist


# ── 全局安全 JSON 编码 ────────────────────────────────────────────────
# 防止 pd.NaT / NaN / Inf / date 等非 JSON 合规值导致 500 错误

class SafeJSONEncoder(json.JSONEncoder):
    def default(self, obj: Any) -> Any:
        return str(obj)


def safe_dumps(obj, **kwargs):
    """安全的 json.dumps，递归清理所有非合规值"""
    def clean(o):
        if isinstance(o, dict):
            return {k: clean(v) for k, v in o.items()}
        elif isinstance(o, list):
            return [clean(v) for v in o]
        elif isinstance(o, float):
            if math.isnan(o) or math.isinf(o):
                return None
            return o
        elif o is None or isinstance(o, (int, str, bool)):
            return o
        return str(o)
    return json.dumps(clean(obj), cls=SafeJSONEncoder, ensure_ascii=False, **kwargs)


class SafeJSONResponse(JSONResponse):
    def render(self, content: Any) -> bytes:
        return safe_dumps(content).encode("utf-8")


app = FastAPI(
    title="自选股工作台",
    description="个人股票分析工作台 - Powered by akshare",
    version="1.0.0",
    default_response_class=SafeJSONResponse,
)

# 日志配置
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

logger = logging.getLogger(__name__)

# ── CORS ─────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── 注册路由 ─────────────────────────────────────────────────────────────

app.include_router(stocks.router)
app.include_router(etf.router)
app.include_router(futures.router)
app.include_router(macro.router)
app.include_router(watchlist.router)


@app.get("/api/health")
async def health_check():
    """健康检查"""
    return {"status": "ok", "version": "1.0.0", "akshare": True}


# ── 静态文件服务（最后注册，避免覆盖 API）─────────────────────────────

FRONTEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend")
if os.path.exists(FRONTEND_DIR):
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
    logger.info(f"前端静态目录: {FRONTEND_DIR}")
else:
    logger.warning(f"前端目录不存在: {FRONTEND_DIR}")


# ── 启动入口 ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=HOST,
        port=PORT,
        reload=True,
        log_level="info",
    )
