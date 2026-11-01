"""自选股管理路由"""

import json
import os
import logging
from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel
from typing import Optional

from config import WATCHLIST_FILE, DEFAULT_WATCHLIST
from services.akshare_service import get_stock_spot_by_codes

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/watchlist", tags=["自选股"])


class StockItem(BaseModel):
    code: str
    name: str = ""
    market: str = "SH"
    remark: Optional[str] = ""


class WatchlistManager:
    """自选股管理器"""

    @staticmethod
    def load() -> list:
        if not os.path.exists(WATCHLIST_FILE):
            # 首次启动写入默认自选股
            WatchlistManager.save(DEFAULT_WATCHLIST)
            return DEFAULT_WATCHLIST
        try:
            with open(WATCHLIST_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            return DEFAULT_WATCHLIST

    @staticmethod
    def save(data: list):
        os.makedirs(os.path.dirname(WATCHLIST_FILE), exist_ok=True)
        with open(WATCHLIST_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    @staticmethod
    def exists(code: str) -> bool:
        items = WatchlistManager.load()
        return any(i["code"] == code for i in items)


@router.get("/")
async def get_watchlist():
    """获取自选股列表"""
    return {"code": 0, "data": WatchlistManager.load()}


@router.get("/quotes")
async def get_watchlist_quotes():
    """获取自选股实时行情"""
    items = WatchlistManager.load()
    codes = [i["code"] for i in items]
    quotes = get_stock_spot_by_codes(codes)

    # 合并自选股备注信息
    code_map = {i["code"]: i for i in items}
    for q in quotes:
        code = q.get("代码", "")
        if code in code_map:
            q["remark"] = code_map[code].get("remark", "")

    return {"code": 0, "data": quotes}


@router.post("/add")
async def add_to_watchlist(item: StockItem):
    """添加股票到自选股"""
    items = WatchlistManager.load()
    # 检查是否已存在
    for i in items:
        if i["code"] == item.code:
            raise HTTPException(status_code=400, detail="该股票已在自选股中")
    items.append(item.dict())
    WatchlistManager.save(items)
    return {"code": 0, "message": f"{item.name}({item.code}) 已添加到自选股"}


@router.post("/remove")
async def remove_from_watchlist(code: str):
    """从自选股移除"""
    items = WatchlistManager.load()
    items = [i for i in items if i["code"] != code]
    WatchlistManager.save(items)
    return {"code": 0, "message": f"已从自选股移除"}


@router.post("/reorder")
async def reorder_watchlist(codes: list = Body(..., embed=True)):
    """重新排序自选股"""
    items = WatchlistManager.load()
    code_order = {c: i for i, c in enumerate(codes)}
    items.sort(key=lambda x: code_order.get(x["code"], 999))
    WatchlistManager.save(items)
    return {"code": 0, "message": "排序已更新"}
