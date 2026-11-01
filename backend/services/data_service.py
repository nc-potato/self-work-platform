"""
数据缓存服务
基于时间的缓存，减少对 akshare 的频繁调用
"""

import time
import functools
import logging

from config import CACHE_TTL

logger = logging.getLogger(__name__)

# 内存缓存
_cache = {}
_cache_timestamps = {}


def cached(ttl: int = CACHE_TTL):
    """数据缓存装饰器"""
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            key = f"{func.__name__}:{args}:{frozenset(kwargs.items())}"
            now = time.time()

            if key in _cache and (now - _cache_timestamps.get(key, 0)) < ttl:
                return _cache[key]

            result = func(*args, **kwargs)

            _cache[key] = result
            _cache_timestamps[key] = now

            return result
        return wrapper
    return decorator


def clear_cache():
    _cache.clear()
    _cache_timestamps.clear()
    logger.info("缓存已清空")


def get_cache_stats() -> dict:
    return {
        "total_entries": len(_cache),
    }
