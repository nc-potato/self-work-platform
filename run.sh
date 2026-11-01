#!/bin/bash
# 自选股工作台 - 启动脚本
# 使用方式: bash run.sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "===================================="
echo "   📊 自选股工作台 v1.0.0"
echo "===================================="
echo ""

# 检查依赖
cd "$SCRIPT_DIR/backend"

echo "[1/3] 检查 Python 依赖..."
pip3 install -q fastapi uvicorn python-multipart 2>/dev/null
echo "  依赖就绪 ✓"

# 启动后端
echo "[2/3] 启动后端 API 服务..."
nohup python3 -m uvicorn main:app --host 0.0.0.0 --port 8899 > /tmp/swp-backend.log 2>&1 &
BACKEND_PID=$!

# 等待后端就绪
for i in $(seq 1 30); do
    if curl -s http://localhost:8899/api/health > /dev/null 2>&1; then
        echo "  后端已启动 (PID: $BACKEND_PID) ✓"
        break
    fi
    sleep 1
done

echo ""
echo "[3/3] 启动完成！"
echo "  访问地址: http://localhost:8899"
echo "  快捷键: Cmd+K / Ctrl+K 搜索添加股票"
echo "  日志: tail -f /tmp/swp-backend.log"
echo ""

# 自动打开浏览器
if [[ "$OSTYPE" == "darwin"* ]]; then
    open "http://localhost:8899"
fi

echo "  按 Ctrl+C 停止服务"
wait $BACKEND_PID
