"""
akshare 数据服务层
仅使用本机可用的 akshare 函数（push2 系列被拦截时自动跳过）
"""

import pandas as pd
import akshare as ak
import time
import logging

logger = logging.getLogger(__name__)

# ── 工具函数 ──────────────────────────────────────────────────────────────

def _safe_call(func, *args, **kwargs):
    """安全调用 akshare 函数，失败返回空 DataFrame"""
    try:
        result = func(*args, **kwargs)
        if result is None:
            return pd.DataFrame()
        return result
    except Exception as e:
        logger.warning(f"akshare 调用失败: {func.__name__} - {type(e).__name__}: {str(e)[:80]}")
        return pd.DataFrame()


def _to_dict(df: pd.DataFrame) -> list:
    """DataFrame → list[dict]，所有值确保 JSON 安全"""
    import math
    from datetime import date, datetime
    if df is None or df.empty:
        return []

    # 递归清理函数
    def _clean(v):
        import math
        from datetime import date, datetime
        if v is None:
            return None
        if isinstance(v, float):
            return None if (math.isnan(v) or math.isinf(v)) else v
        if isinstance(v, (date, datetime)):
            return str(v)
        if isinstance(v, (int, str, bool)):
            return v
        # pd.NaT, pd.NA, bytes, 或其他无法 JSON 序列化的类型
        try:
            if pd.isna(v):
                return None
        except Exception:
            pass
        return str(v)

    df = df.applymap(_clean)
    return df.to_dict(orient="records")


# ── 股票数据（push2delay 直达，避免新浪慢速）─────────────────────────────

PUSH2_FIELDS = "f2,f3,f4,f5,f6,f7,f8,f9,f10,f12,f14,f15,f16,f17,f18,f20,f21,f23,f24,f25"
PUSH2_FS = "m:0 t:6,m:0 t:80,m:1 t:2,m:1 t:23,m:0 t:81 s:2048"
PUSH2_COL_MAP = {
    "f12": "代码", "f14": "名称",
    "f2": "最新价", "f3": "涨跌幅", "f4": "涨跌额",
    "f5": "成交量", "f6": "成交额",
    "f7": "振幅", "f8": "换手率", "f9": "市盈率-动态", "f10": "量比",
    "f15": "最高", "f16": "最低", "f17": "今开", "f18": "昨收",
    "f20": "总市值", "f21": "流通市值",
    "f23": "市净率", "f24": "60日涨跌幅", "f25": "年初至今涨跌幅",
    # ETF
    "f62": "折溢价率", "f69": "净值",
    # 板块资金流
}
# 板块资金流专用映射（字段用途不同）
SECTOR_COL_MAP = {
    "f12": "代码", "f14": "名称",
    "f2": "板块指数", "f3": "涨跌幅", "f4": "涨跌额",
    "f62": "主力净流入", "f69": "净流入占比",
    "f66": "超大单净流入", "f72": "大单净流入",
    "f78": "中单净流入", "f84": "小单净流入",
    "f184": "今日涨跌幅",
    "f124": "资金排名",
}


def _fetch_push2_fs(fs: str, fields: str, col_map: dict = None) -> list:
    """从 push2delay.eastmoney.com 获取分页全量数据（每页最多100条）"""
    import requests
    url = "https://push2delay.eastmoney.com/api/qt/clist/get"
    all_items, page = [], 1
    PAGE_SIZE = 100
    use_map = col_map or PUSH2_COL_MAP
    while True:
        params = {
            "pn": str(page), "pz": str(PAGE_SIZE), "po": "1", "np": "1",
            "ut": "bd1d9ddb04089700cf9c27f6f7426281",
            "fltt": "2", "invt": "2", "fid": "f12",
            "fs": fs, "fields": fields,
        }
        try:
            r = requests.get(url, params=params, timeout=10)
            if r.status_code != 200:
                break
            body = r.json().get("data", {})
            diff = body.get("diff", [])
            if not diff:
                break
            all_items.extend(diff)
            total = body.get("total", 0)
            if len(all_items) >= total or len(diff) < PAGE_SIZE:
                break
            page += 1
        except Exception as e:
            logger.warning(f"push2delay 分页失败: {e}")
            break
    # 字段名映射
    result = []
    for item in all_items:
        row = {}
        for k, v in item.items():
            row[use_map.get(k, k)] = v
        code = str(row.get("代码", ""))
        if code.startswith("6"):
            row["_market"] = "SH"
        elif code.startswith(("0", "3")):
            row["_market"] = "SZ"
        elif code.startswith(("4", "8")):
            row["_market"] = "BJ"
        else:
            row["_market"] = "SH"
        result.append(row)
    return result


def get_stock_spot_all() -> list:
    """获取沪深A股实时行情（push2delay，秒级）"""
    return _fetch_push2_fs(PUSH2_FS, PUSH2_FIELDS)


def get_stock_spot_by_codes(codes: list) -> list:
    """根据代码列表筛选实时行情"""
    all_data = get_stock_spot_all()
    raw_codes = set(c.upper() for c in codes)
    return [s for s in all_data if str(s.get("代码", "")).upper() in raw_codes]


def _code_to_tx_symbol(code: str) -> str:
    """股票代码转腾讯格式 (sz000001 / sh600519)"""
    code = str(code).strip()
    if code.startswith("6") or code.startswith("9"):
        return f"sh{code}"
    elif code.startswith("0") or code.startswith("3") or code.startswith("2"):
        return f"sz{code}"
    elif code.startswith("4") or code.startswith("8"):
        return f"bj{code}"
    return f"sh{code}"


def get_stock_history(code: str, period: str = "daily",
                      start_date: str = None, end_date: str = None) -> list:
    """获取股票历史K线（腾讯接口）"""
    symbol = _code_to_tx_symbol(code)
    end = end_date or time.strftime("%Y%m%d")
    start = start_date or "20200101"

    try:
        df = ak.stock_zh_a_hist_tx(symbol=symbol, start_date=start,
                                   end_date=end, adjust="qfq")
        if df.empty:
            return []
        # 统一列名
        df = df.rename(columns={
            "date": "日期", "open": "开盘", "close": "收盘",
            "high": "最高", "low": "最低", "amount": "成交额",
        })
        df["成交量"] = None  # 腾讯接口不含成交量
        return _to_dict(df)
    except Exception as e:
        logger.warning(f"腾讯日K失败 {symbol}: {e}")
        return []


def search_stock(keyword: str) -> list:
    """搜索股票（代码或名称）"""
    all_data = get_stock_spot_all()
    results = []
    kw = keyword.upper()
    for s in all_data:
        code = str(s.get("代码", ""))
        name = str(s.get("名称", ""))
        if kw in code or kw in name:
            if code.startswith("6") or code.startswith("9"):
                market = "SH"
            elif code.startswith("0") or code.startswith("3"):
                market = "SZ"
            elif code.startswith("4") or code.startswith("8"):
                market = "BJ"
            else:
                market = "SH"
            results.append({
                "code": code, "name": name, "market": market,
                "price": s.get("最新价"), "change_pct": s.get("涨跌幅"),
            })
        if len(results) >= 20:
            break
    return results


# ── ETF 数据 ─────────────────────────────────────────────────────────────

def get_etf_spot_all() -> list:
    """获取 ETF 实时行情（push2delay 直达）"""
    etf_fields = "f2,f3,f4,f5,f6,f12,f14,f15,f16,f17,f18,f62,f63,f64,f65,f66,f69,f72,f75,f78,f81,f84,f87,f115,f124,f128,f136,f152,f184"
    etf_fs = "b:MK0021,b:MK0022,b:MK0023,b:MK0024,b:MK0827"
    data = _fetch_push2_fs(etf_fs, etf_fields)
    for item in data:
        code = str(item.get("代码", ""))
        item["market"] = "SH" if (code.startswith("51") or code.startswith("56")) else "SZ"
        item["type"] = "ETF" if "ETF" in str(item.get("名称", "")).upper() else "LOF"
    return data


# ── 指数数据 ─────────────────────────────────────────────────────────────

INDEX_CODES = {
    "sh000001": "上证指数",
    "sz399001": "深证成指",
    "sz399006": "创业板指",
    "sh000688": "科创50",
    "sh000300": "沪深300",
    "sh000016": "上证50",
}


def get_index_daily(code: str = "sh000001") -> list:
    """指定指数的日线数据"""
    df = _safe_call(ak.stock_zh_index_daily, code)
    return _to_dict(df)


def get_index_spot() -> list:
    """获取多个主要指数最新行情"""
    results = []
    for code, name in INDEX_CODES.items():
        df = _safe_call(ak.stock_zh_index_daily, code)
        if not df.empty:
            latest = df.iloc[-1].to_dict()
            latest["name"] = name
            latest["code"] = code
            results.append(latest)
    return results


# ── 涨停数据 ─────────────────────────────────────────────────────────────

def get_limit_up_today() -> list:
    """今日涨停股票（东方财富）"""
    today = time.strftime("%Y%m%d")
    df = _safe_call(ak.stock_zt_pool_em, date=today)
    return _to_dict(df)


def get_limit_up_previous() -> list:
    """昨日涨停股票"""
    yesterday = time.strftime("%Y%m%d", time.localtime(time.time() - 86400))
    df = _safe_call(ak.stock_zt_pool_em, date=yesterday)
    return _to_dict(df)


# ── 资金流向 ─────────────────────────────────────────────────────────────

def get_money_flow_individual(code: str) -> list:
    """个股资金流向"""
    market = "sh" if code.startswith("6") else "sz"
    df = _safe_call(ak.stock_individual_fund_flow, stock=code, market=market)
    return _to_dict(df)


# ── 宏观经济数据 ─────────────────────────────────────────────────────────

def get_macro_gdp() -> list:
    """中国 GDP"""
    return _to_dict(_safe_call(ak.macro_china_gdp_yearly))


def get_macro_cpi() -> list:
    """中国 CPI"""
    return _to_dict(_safe_call(ak.macro_china_cpi_yearly))


def get_macro_pmi() -> list:
    """中国 PMI"""
    return _to_dict(_safe_call(ak.macro_china_pmi))


def get_macro_money_supply() -> list:
    """货币供应量 M0/M1/M2"""
    return _to_dict(_safe_call(ak.macro_china_money_supply))


def get_macro_shibor() -> list:
    """Shibor 利率"""
    return _to_dict(_safe_call(ak.macro_china_shibor_all))


def get_macro_lpr() -> list:
    """LPR 利率"""
    return _to_dict(_safe_call(ak.macro_china_lpr))


def get_macro_exchange_rate() -> list:
    """人民币汇率中间价"""
    try:
        df = ak.currency_boc_safe()
        return _to_dict(df)
    except Exception as e:
        logger.warning(f"汇率获取失败: {e}")
        return []


# ── 市场概览 ─────────────────────────────────────────────────────────────

def get_market_overview() -> dict:
    """市场概览"""
    result = {}

    # 指数（每个指数最新一条）
    result["indices"] = get_index_spot()

    # 涨停跌停统计
    try:
        up = get_limit_up_today()
        result["limit_up"] = len(up)
        down = get_limit_up_previous()
        down_count = 0
        for item in down:
            if item.get("pctChg", 0) and float(item.get("pctChg", 0)) < -9.5:
                down_count += 1
        result["limit_down"] = down_count
    except Exception:
        result["limit_up"] = 0
        result["limit_down"] = 0

    # 板块资金流
    try:
        result["sectors"] = get_sector_money_flow(8)
    except Exception:
        result["sectors"] = {"inflow": [], "outflow": []}

    return result


# ── 板块资金流 ─────────────────────────────────────────────────────────

def get_sector_money_flow(top_n: int = 10) -> dict:
    """获取板块资金流入流出排名

    Returns:
        {"inflow": [...], "outflow": [...]} 各 top_n 条
    """
    fs = "m:90+t:2"  # 申万行业板块
    fields = "f12,f14,f2,f3,f4,f62,f66,f69,f72,f78,f84,f124,f184"
    data = _fetch_push2_fs(fs, fields, col_map=SECTOR_COL_MAP)
    if not data:
        return {"inflow": [], "outflow": []}

    def _v(item, key):
        try:
            v = item.get(key)
            return float(v) if v not in (None, '-', '--', '') else 0
        except (ValueError, TypeError):
            return 0

    sorted_data = sorted(data, key=lambda x: _v(x, "主力净流入"), reverse=True)
    return {
        "inflow": sorted_data[:top_n],
        "outflow": sorted_data[-top_n:][::-1],
    }
