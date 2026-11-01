/**
 * 图表工具库 — 基于 ECharts
 * 提供统一的图表创建函数和主题配置
 */

const CHART_THEME = {
    backgroundColor: 'transparent',
    textStyle: { color: '#94a3b8' },
    grid: {
        show: false,
        borderWidth: 0,
        top: 30,
        bottom: 30,
        left: 50,
        right: 20,
    },
    legend: {
        textStyle: { color: '#94a3b8', fontSize: 11 },
    },
    tooltip: {
        backgroundColor: '#1a2332',
        borderColor: '#1e293b',
        borderWidth: 1,
        textStyle: { color: '#e2e8f0', fontSize: 12 },
    },
    xAxis: {
        axisLine: { lineStyle: { color: '#1e293b' } },
        axisTick: { lineStyle: { color: '#1e293b' } },
        axisLabel: { color: '#64748b', fontSize: 11 },
        splitLine: { show: false },
        type: 'category',
    },
    yAxis: {
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#64748b', fontSize: 11 },
        splitLine: { lineStyle: { color: '#1e293b', type: 'dashed' } },
        type: 'value',
    },
};

const ChartLib = {
    /**
     * 在指定容器中创建 K 线图
     * @param {HTMLElement|string} el - 容器元素或 ID
     * @param {Array} data - K 线数据 [{日期,开盘,收盘,最高,最低,成交量,...}]
     * @param {Object} opts - 选项
     */
    createKLine(el, data, opts = {}) {
        const dom = typeof el === 'string' ? document.getElementById(el) : el;
        if (!dom || !data?.length) return null;

        const chart = echarts.init(dom);
        const dates = data.map(d => d['日期'] || d.date || d['时间'] || d.time);
        const volumes = data.map(d => parseFloat(d['成交量'] || d.volume || 0));

        const kLineData = data.map(d => [
            parseFloat(d['开盘'] || d.open),
            parseFloat(d['收盘'] || d.close),
            parseFloat(d['最低'] || d.low),
            parseFloat(d['最高'] || d.high),
        ]);

        const option = {
            ...CHART_THEME,
            tooltip: {
                ...CHART_THEME.tooltip,
                trigger: 'axis',
                axisPointer: { type: 'cross' },
            },
            grid: { ...CHART_THEME.grid, bottom: 80, ...opts.grid },
            xAxis: {
                ...CHART_THEME.xAxis,
                data: dates,
                axisLabel: {
                    color: '#64748b',
                    fontSize: 10,
                    formatter: (v) => v?.toString().slice(4) || '',
                },
            },
            yAxis: [
                { ...CHART_THEME.yAxis, scale: true, position: 'right' },
                { type: 'value', name: '成交量', nameTextStyle: { fontSize: 10, color: '#64748b' },
                  axisLabel: { show: false }, splitLine: { show: false },
                  gridIndex: 1, position: 'right' },
            ],
            dataZoom: [
                { type: 'inside', xAxisIndex: [0, 1], start: 60, end: 100 },
                { type: 'slider', xAxisIndex: [0, 1], height: 20, bottom: 10,
                  borderColor: '#1e293b', backgroundColor: '#111827',
                  fillerColor: 'rgba(59,130,246,0.1)',
                  handleStyle: { color: '#3b82f6' },
                  textStyle: { color: '#64748b' },
                  labelFormatter: (v) => dates[v]?.toString().slice(4) || '' },
            ],
            series: [
                {
                    type: 'candlestick',
                    data: kLineData,
                    itemStyle: {
                        color: '#ef4444',
                        color0: '#22c55e',
                        borderColor: '#ef4444',
                        borderColor0: '#22c55e',
                    },
                    markLine: opts.markLine || {},
                },
                {
                    type: 'bar',
                    data: volumes,
                    yAxisIndex: 1,
                    xAxisIndex: 1,
                    itemStyle: {
                        color: (p) => {
                            const idx = p.dataIndex;
                            return kLineData[idx]?.[1] >= kLineData[idx]?.[0]
                                ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)';
                        },
                    },
                },
            ],
        };

        chart.setOption(option);
        window.addEventListener('resize', () => chart.resize());
        return chart;
    },

    /**
     * 创建折线图
     */
    createLine(el, xData, yData, opts = {}) {
        const dom = typeof el === 'string' ? document.getElementById(el) : el;
        if (!dom) return null;

        const chart = echarts.init(dom);
        const name = opts.name || '数值';
        const color = opts.color || '#3b82f6';
        const series = opts.series || [];

        const option = {
            ...CHART_THEME,
            tooltip: { ...CHART_THEME.tooltip, trigger: 'axis' },
            grid: opts.grid || CHART_THEME.grid,
            xAxis: { ...CHART_THEME.xAxis, data: xData, ...opts.xAxis },
            yAxis: [{ ...CHART_THEME.yAxis, name: opts.yName || '', ...opts.yAxis }],
            series: [
                {
                    type: 'line',
                    name,
                    data: yData,
                    smooth: opts.smooth ?? true,
                    symbol: opts.symbol ?? 'none',
                    lineStyle: { color, width: 2 },
                    areaStyle: opts.area ? {
                        color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                                 colorStops: [
                                     { offset: 0, color: color + '40' },
                                     { offset: 1, color: color + '05' },
                                 ] },
                    } : undefined,
                    itemStyle: { color },
                    markLine: opts.markLine,
                },
                ...series,
            ],
            legend: {
                ...CHART_THEME.legend,
                show: series.length > 0 || opts.showLegend,
            },
        };

        chart.setOption(option);
        window.addEventListener('resize', () => chart.resize());
        return chart;
    },

    /**
     * 创建柱状图
     */
    createBar(el, xData, yData, opts = {}) {
        const dom = typeof el === 'string' ? document.getElementById(el) : el;
        if (!dom) return null;

        const chart = echarts.init(dom);
        const colors = yData.map(v => v >= 0 ? '#ef4444' : '#22c55e');

        const option = {
            ...CHART_THEME,
            tooltip: { ...CHART_THEME.tooltip, trigger: 'axis' },
            xAxis: { ...CHART_THEME.xAxis, data: xData },
            yAxis: { ...CHART_THEME.yAxis, name: opts.yName || '' },
            series: [{
                type: 'bar',
                data: yData.map((v, i) => ({
                    value: v,
                    itemStyle: { color: opts.colors?.[i] || colors[i] || '#3b82f6' },
                })),
                barWidth: opts.barWidth || '60%',
            }],
            grid: opts.grid || CHART_THEME.grid,
        };

        chart.setOption(option);
        window.addEventListener('resize', () => chart.resize());
        return chart;
    },

    /**
     * 创建饼图
     */
    createPie(el, data, opts = {}) {
        const dom = typeof el === 'string' ? document.getElementById(el) : el;
        if (!dom) return null;

        const chart = echarts.init(dom);
        const colors = opts.colors || ['#3b82f6', '#22c55e', '#eab308', '#a855f7', '#ef4444', '#06b6d4'];

        const option = {
            backgroundColor: 'transparent',
            tooltip: { ...CHART_THEME.tooltip, trigger: 'item' },
            legend: {
                ...CHART_THEME.legend,
                orient: 'vertical', right: 10, top: 'center',
            },
            series: [{
                type: 'pie',
                radius: ['40%', '70%'],
                center: ['40%', '50%'],
                avoidLabelOverlap: true,
                itemStyle: { borderRadius: 6, borderColor: '#111827', borderWidth: 2 },
                label: { show: false },
                emphasis: { label: { show: true, fontSize: 14 } },
                data: data.map((d, i) => ({
                    name: d.name,
                    value: d.value,
                    itemStyle: { color: colors[i % colors.length] },
                })),
            }],
            grid: { ...CHART_THEME.grid, bottom: 10 },
        };

        chart.setOption(option);
        window.addEventListener('resize', () => chart.resize());
        return chart;
    },

    /**
     * 创建大数字指标（仪表盘样式）
     */
    createGauge(el, value, opts = {}) {
        const dom = typeof el === 'string' ? document.getElementById(el) : el;
        if (!dom) return null;

        const chart = echarts.init(dom);
        const option = {
            series: [{
                type: 'gauge',
                center: ['50%', '60%'],
                radius: '100%',
                startAngle: 200,
                endAngle: -20,
                min: opts.min || 0,
                max: opts.max || 100,
                progress: { show: true, width: 8, itemStyle: { color: opts.color || '#3b82f6' } },
                axisLine: { lineStyle: { width: 8, color: [[1, '#1e293b']] } },
                axisTick: { show: false },
                splitLine: { length: 6, lineStyle: { width: 2, color: '#334155' } },
                axisLabel: { distance: 20, color: '#64748b', fontSize: 10 },
                detail: {
                    valueAnimation: true,
                    formatter: opts.formatter || '{value}',
                    color: opts.color || '#e2e8f0',
                    fontSize: 18,
                    fontWeight: 700,
                    fontFamily: 'monospace',
                },
                data: [{ value, name: opts.name || '' }],
            }],
        };

        chart.setOption(option);
        return chart;
    },

    /**
     * 销毁图表实例
     */
    dispose(el) {
        const dom = typeof el === 'string' ? document.getElementById(el) : el;
        if (dom) echarts.dispose(dom);
    },
};
