'use client';

import React from 'react';
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

interface ChartData {
  name: string;
  fullName?: string;
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
}

export function ReusableChart({
  title,
  data,
  dataKey,
  secondaryDataKey,
  chartType,
  colorStart = '#3B82F6',
  colorEnd = '#8B5CF6',
  height = 300,
}: ReusableChartProps) {
  const gradientId = React.useId();

  const renderChart = () => {
    switch (chartType) {
      case 'bar':
        return (
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
            <XAxis
              dataKey="name"
              angle={-45}
              textAnchor="end"
              height={70}
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
            />
            <YAxis tick={{ fill: '#9CA3AF' }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1A1A24', borderColor: colorStart, borderRadius: '8px' }}
              labelFormatter={(label) => {
                const item = data.find((d) => d.name === label);
                return item?.fullName || label;
              }}
            />
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colorStart} stopOpacity={0.9} />
                <stop offset="100%" stopColor={colorEnd} stopOpacity={0.6} />
              </linearGradient>
            </defs>
            <Bar dataKey={dataKey} fill={`url(#${gradientId})`} radius={[8, 8, 0, 0]} />
            {secondaryDataKey && (
              <Bar dataKey={secondaryDataKey} fill={colorEnd} radius={[8, 8, 0, 0]} />
            )}
          </BarChart>
        );

      case 'line':
        return (
          <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
            <XAxis
              dataKey="name"
              angle={-45}
              textAnchor="end"
              height={70}
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
            />
            <YAxis tick={{ fill: '#9CA3AF' }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1A1A24', borderColor: colorStart, borderRadius: '8px' }}
              labelFormatter={(label) => {
                const item = data.find((d) => d.name === label);
                return item?.fullName || label;
              }}
            />
            <Line type="monotone" dataKey={dataKey} stroke={colorStart} strokeWidth={2} dot={{ fill: colorStart }} />
            {secondaryDataKey && (
              <Line type="monotone" dataKey={secondaryDataKey} stroke={colorEnd} strokeWidth={2} dot={{ fill: colorEnd }} />
            )}
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
            <XAxis
              dataKey="name"
              angle={-45}
              textAnchor="end"
              height={70}
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
            />
            <YAxis tick={{ fill: '#9CA3AF' }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1A1A24', borderColor: colorStart, borderRadius: '8px' }}
              labelFormatter={(label) => {
                const item = data.find((d) => d.name === label);
                return item?.fullName || label;
              }}
            />
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colorStart} stopOpacity={0.8} />
                <stop offset="100%" stopColor={colorStart} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey={dataKey} stroke={colorStart} fill={`url(#${gradientId})`} />
            {secondaryDataKey && (
              <Area type="monotone" dataKey={secondaryDataKey} stroke={colorEnd} fill="none" />
            )}
          </AreaChart>
        );

      case 'stacked':
        return (
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
            <XAxis
              dataKey="name"
              angle={-45}
              textAnchor="end"
              height={70}
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
            />
            <YAxis tick={{ fill: '#9CA3AF' }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1A1A24', borderColor: colorStart, borderRadius: '8px' }}
              labelFormatter={(label) => {
                const item = data.find((d) => d.name === label);
                return item?.fullName || label;
              }}
            />
            <Legend wrapperStyle={{ color: '#D1D5DB' }} />
            <Bar dataKey={dataKey} stackId="a" fill={colorStart} radius={[4, 4, 0, 0]} />
            {secondaryDataKey && (
              <Bar dataKey={secondaryDataKey} stackId="a" fill={colorEnd} radius={[4, 4, 0, 0]} />
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
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color || (index === 0 ? colorStart : colorEnd)} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ backgroundColor: '#1A1A24', borderColor: colorStart, borderRadius: '8px' }}
            />
          </PieChart>
        );

      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 p-6 hover:border-white/20 transition-all duration-300"
    >
      <h3 className="text-white font-semibold text-lg mb-4 flex items-center justify-between">
        {title}
        <span className="text-xs text-gray-400">
          {chartType === 'pie' ? 'Distribution' : `${data.length} products`}
        </span>
      </h3>
      <ResponsiveContainer width="100%" height={height}>
        {renderChart()}
      </ResponsiveContainer>
    </motion.div>
  );
}