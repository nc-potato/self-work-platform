"""ETF 数据路由"""

from fastapi import APIRouter
import logging

from services.akshare_service import get_etf_spot_all

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/etf", tags=["ETF"])


@router.get("/spot")
async def etf_spot():
    """获取全部 ETF 实时行情"""
    return {"code": 0, "data": get_etf_spot_all()}


@router.get("/hot")
async def etf_hot():
    """热门 ETF（按成交额排序）"""
    data = get_etf_spot_all()
    def _safe_float(v):
        try:
            return float(v) if v not in (None, '-', '--', '') else 0
        except (ValueError, TypeError):
            return 0
    sorted_data = sorted(data,
                         key=lambda x: _safe_float(x.get("成交额")),
                         reverse=True)
    return {"code": 0, "data": sorted_data[:50]}
