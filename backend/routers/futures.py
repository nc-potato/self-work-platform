"""期货数据路由（当前无可用接口，保留端点）"""

from fastapi import APIRouter
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/futures", tags=["期货"])


@router.get("/spot")
async def futures_spot():
    """获取期货行情（当前不可用）"""
    return {"code": 0, "data": []}


@router.get("/foreign")
async def foreign_futures():
    """外盘期货（当前不可用）"""
    return {"code": 0, "data": []}
