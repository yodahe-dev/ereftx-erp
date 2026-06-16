'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Maximize2,
  Minimize2,
} from 'lucide-react';

interface ChartData {
  name: string;
  fullName?: string;
  fullDate?: string;
  tooltipLabel?: string;
  value?: number;
  Boxes?: number;
  Bottles?: number;
  [key: string]: any;
}

interface ReusableChartProps {
  title: string;
  data: ChartData[];
  dataKey: string;
  secondaryDataKey?: string;
  chartType: 'bar' | 'line' | 'area' | 'stacked' | 'pie';
  colorStart?: string;
  colorEnd?: string;
  height?: number;
  xAxisTickFormatter?: (value: string) => string;
  tooltipLabelFormatter?: (label: string) => string;
}

// ── Fullscreen Hook ──
function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [height, setHeight] = useState(300);
  const ref = useRef<HTMLDivElement>(null);

  const toggleFullscreen = async () => {
    if (!ref.current) return;
    if (!document.fullscreenElement) {
      await ref.current.requestFullscreen();
      setIsFullscreen(true);
      setHeight(window.innerHeight - 160);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
      setHeight(300);
    }
  };

  const handleFullscreenChange = useCallback(() => {
    const fs = !!document.fullscreenElement;
    setIsFullscreen(fs);
    setHeight(fs ? window.innerHeight - 160 : 300);
  }, []);

  const handleResize = useCallback(() => {
    if (isFullscreen) setHeight(window.innerHeight - 160);
  }, [isFullscreen]);

  useEffect(() => {
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('resize', handleResize);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('resize', handleResize);
    };
  }, [handleFullscreenChange, handleResize]);

  return { ref, isFullscreen, height, toggleFullscreen };
}

// ── Component ──

export function ReusableChart({
  title,
  data,
  dataKey,
  secondaryDataKey,
  chartType,
  colorStart = '#3B82F6',
  colorEnd = '#8B5CF6',
  height: initialHeight = 300,
  xAxisTickFormatter,
  tooltipLabelFormatter,
}: ReusableChartProps) {
  const gradientId = React.useId();
  const { ref, isFullscreen, height: fsHeight, toggleFullscreen } = useFullscreen();

  const chartHeight = isFullscreen ? fsHeight : initialHeight;

  // Helper: format date for tooltip
  const labelFormatter = (label: any) => {
    if (typeof label === 'string') {
      if (tooltipLabelFormatter) return tooltipLabelFormatter(label);
      const item = data.find((d) => d.name === label);
      return item?.fullDate || item?.fullName || label;
    }
    return label;
  };

  // Common props for charts with X axis
  const commonChartProps = {
    data,
    margin: { top: 20, right: 30, left: 20, bottom: 60 },
    onMouseEnter: () => { if (ref.current) ref.current.style.cursor = 'crosshair'; },
    onMouseLeave: () => { if (ref.current) ref.current.style.cursor = 'default'; },
  };

  const commonAxisProps = {
    dataKey: 'name',
    angle: -45,
    textAnchor: 'end' as const,
    height: 70,
    tick: { fill: '#9CA3AF', fontSize: 11 },
    tickFormatter: xAxisTickFormatter,
  };

  const commonTooltipProps = {
    contentStyle: { backgroundColor: '#1A1A24', borderColor: colorStart, borderRadius: '8px' },
    labelFormatter,
    formatter: (value: any, name: any) => [`${Number(value).toLocaleString()}`, name],
  };

  // ── Render chart based on type ──
  const renderChart = () => {
    const animDuration = 600;
    const animEasing = 'ease-in-out';

    switch (chartType) {
      case 'bar':
        return (
          <BarChart {...commonChartProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
            <XAxis {...commonAxisProps} />
            <YAxis tick={{ fill: '#9CA3AF' }} />
            <Tooltip {...commonTooltipProps} />
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colorStart} stopOpacity={0.9} />
                <stop offset="100%" stopColor={colorEnd} stopOpacity={0.6} />
              </linearGradient>
            </defs>
            <Bar
              dataKey={dataKey}
              fill={`url(#${gradientId})`}
              radius={[8, 8, 0, 0]}
              animationDuration={animDuration}
              animationEasing={animEasing}
              animationBegin={100}
            />
            {secondaryDataKey && (
              <Bar
                dataKey={secondaryDataKey}
                fill={colorEnd}
                radius={[8, 8, 0, 0]}
                animationDuration={animDuration}
                animationEasing={animEasing}
                animationBegin={200}
              />
            )}
          </BarChart>
        );

      case 'line':
        return (
          <LineChart {...commonChartProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
            <XAxis {...commonAxisProps} />
            <YAxis tick={{ fill: '#9CA3AF' }} />
            <Tooltip {...commonTooltipProps} />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={colorStart}
              strokeWidth={2}
              dot={{ fill: colorStart, r: 4 }}
              activeDot={{ r: 6 }}
              animationDuration={animDuration}
              animationEasing={animEasing}
              animationBegin={0}
            />
            {secondaryDataKey && (
              <Line
                type="monotone"
                dataKey={secondaryDataKey}
                stroke={colorEnd}
                strokeWidth={2}
                dot={{ fill: colorEnd, r: 4 }}
                activeDot={{ r: 6 }}
                animationDuration={animDuration}
                animationEasing={animEasing}
                animationBegin={100}
              />
            )}
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart {...commonChartProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
            <XAxis {...commonAxisProps} />
            <YAxis tick={{ fill: '#9CA3AF' }} />
            <Tooltip {...commonTooltipProps} />
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colorStart} stopOpacity={0.8} />
                <stop offset="100%" stopColor={colorStart} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={colorStart}
              fill={`url(#${gradientId})`}
              animationDuration={animDuration}
              animationEasing={animEasing}
              animationBegin={0}
            />
            {secondaryDataKey && (
              <Area
                type="monotone"
                dataKey={secondaryDataKey}
                stroke={colorEnd}
                fill="none"
                animationDuration={animDuration}
                animationEasing={animEasing}
                animationBegin={100}
              />
            )}
          </AreaChart>
        );

      case 'stacked':
        return (
          <BarChart {...commonChartProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
            <XAxis {...commonAxisProps} />
            <YAxis tick={{ fill: '#9CA3AF' }} />
            <Tooltip {...commonTooltipProps} />
            <Legend wrapperStyle={{ color: '#D1D5DB' }} />
            <Bar
              dataKey={dataKey}
              stackId="a"
              fill={colorStart}
              radius={[4, 4, 0, 0]}
              animationDuration={animDuration}
              animationEasing={animEasing}
              animationBegin={100}
            />
            {secondaryDataKey && (
              <Bar
                dataKey={secondaryDataKey}
                stackId="a"
                fill={colorEnd}
                radius={[4, 4, 0, 0]}
                animationDuration={animDuration}
                animationEasing={animEasing}
                animationBegin={200}
              />
            )}
          </BarChart>
        );

      case 'pie':
        return (
          <PieChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={5}
              dataKey={dataKey}
              label={({ name, percent }) => `${name} ${(percent as number * 100).toFixed(0)}%`}
              labelLine={false}
              animationDuration={animDuration}
              animationEasing={animEasing}
              animationBegin={0}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color || (index === 0 ? colorStart : colorEnd)}
                  style={{ transition: 'opacity 0.3s ease' }}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ backgroundColor: '#1A1A24', borderColor: colorStart, borderRadius: '8px' }}
              labelFormatter={labelFormatter}
              formatter={(value, name) => [`${Number(value).toLocaleString()}`, name]}
            />
          </PieChart>
        );

      default:
        return null;
    }
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      whileHover={{ scale: 1.005 }}
      className={`backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 p-6 hover:border-white/20 transition-all duration-300 ${
        isFullscreen
          ? 'fixed inset-0 z-50 bg-black/90 flex items-center justify-center'
          : ''
      }`}
    >
      <div className="w-full h-full flex flex-col">
        {/* Header controls */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="text-white font-semibold text-lg flex items-center gap-2">
            {title}
            {isFullscreen && (
              <span className="text-xs text-gray-400">(Fullscreen)</span>
            )}
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Fullscreen */}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFullscreen}
              className="border-white/20 hover:bg-white/10 text-white"
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Chart */}
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height={chartHeight}>
            {renderChart()}
          </ResponsiveContainer>
        </div>

        {/* Footer */}
        {data.length > 0 && !isFullscreen && (
          <div className="text-xs text-gray-500 mt-2 flex justify-end">
            {data.length} data points
          </div>
        )}
      </div>
    </motion.div>
  );
}