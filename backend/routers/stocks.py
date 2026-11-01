"""股票数据路由"""

from fastapi import APIRouter, Query
from typing import Optional
import logging

from services.akshare_service import (
    get_stock_spot_all,
    get_stock_spot_by_codes,
    get_stock_history,
    search_stock,
    get_money_flow_individual,
    get_limit_up_today,
    get_limit_up_previous,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/stocks", tags=["股票"])


@router.get("/spot")
async def stock_spot():
    """获取全市场股票实时行情（新浪）"""
    return {"code": 0, "data": get_stock_spot_all()}


@router.get("/spot/list")
async def stock_spot_by_codes_list(codes: str = Query("", description="股票代码，逗号分隔")):
    """按代码列表获取实时行情"""
    code_list = [c.strip() for c in codes.split(",") if c.strip()]
    if not code_list:
        return {"code": 0, "data": []}
    return {"code": 0, "data": get_stock_spot_by_codes(code_list)}


@router.get("/history")
async def stock_history(
    code: str = Query(..., description="股票代码"),
    period: str = Query("daily", description="周期: daily"),
    start: Optional[str] = Query(None, description="开始日期 YYYYMMDD"),
    end: Optional[str] = Query(None, description="结束日期 YYYYMMDD"),
):
    """获取股票历史K线（腾讯接口）"""
    return {"code": 0, "data": get_stock_history(code, period, start, end)}


@router.get("/search")
async def stock_search(keyword: str = Query(..., description="搜索关键词")):
    """搜索股票"""
    return {"code": 0, "data": search_stock(keyword)}


@router.get("/limit-up")
async def stock_limit_up():
    """今日涨停股票"""
    return {"code": 0, "data": get_limit_up_today()}


@router.get("/money-flow")
async def stock_money_flow(code: str = Query(..., description="股票代码")):
    """个股资金流向"""
    return {"code": 0, "data": get_money_flow_individual(code)}
