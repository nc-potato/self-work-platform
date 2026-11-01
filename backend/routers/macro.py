"""宏观经济数据路由"""

from fastapi import APIRouter
import logging

from services.akshare_service import (
    get_macro_gdp,
    get_macro_cpi,
    get_macro_pmi,
    get_macro_money_supply,
    get_macro_shibor,
    get_macro_lpr,
    get_macro_exchange_rate,
    get_market_overview,
    get_index_spot,
    get_sector_money_flow,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/macro", tags=["宏观"])


@router.get("/overview")
async def market_overview():
    """市场概览（指数+涨停统计）"""
    return {"code": 0, "data": get_market_overview()}


@router.get("/indices")
async def indices():
    """主要指数行情"""
    return {"code": 0, "data": get_index_spot()}


@router.get("/gdp")
async def macro_gdp():
    return {"code": 0, "data": get_macro_gdp()}


@router.get("/cpi")
async def macro_cpi():
    return {"code": 0, "data": get_macro_cpi()}


@router.get("/pmi")
async def macro_pmi():
    return {"code": 0, "data": get_macro_pmi()}


@router.get("/money-supply")
async def macro_money_supply():
    return {"code": 0, "data": get_macro_money_supply()}


@router.get("/shibor")
async def macro_shibor():
    return {"code": 0, "data": get_macro_shibor()}


@router.get("/lpr")
async def macro_lpr():
    return {"code": 0, "data": get_macro_lpr()}


@router.get("/exchange-rate")
async def macro_exchange_rate():
    return {"code": 0, "data": get_macro_exchange_rate()}


@router.get("/sectors")
async def macro_sectors(top: int = 10):
    """板块资金流入流出排名"""
    return {"code": 0, "data": get_sector_money_flow(top)}
