'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { motion } from 'framer-motion';

interface BarChartData {
  name: string;
  fullName?: string;
  value: number;
}

interface BarChartComponentProps {
  title: string;
  data: BarChartData[];
  dataKey: string;
  colorStart?: string;
  colorEnd?: string;
  height?: number;
}

export function BarChartComponent({
  title,
  data,
  dataKey,
  colorStart = '#3B82F6',
  colorEnd = '#8B5CF6',
  height = 300,
}: BarChartComponentProps) {
  const gradientId = React.useId();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 p-6 hover:border-white/20 transition-all duration-300"
    >
      <h3 className="text-white font-semibold text-lg mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
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
            formatter={(value: string | number | readonly (string | number)[] | undefined) => {
              const numericValue = Array.isArray(value)
                ? Number(value[0])
                : typeof value === 'number'
                ? value
                : value
                ? Number(value)
                : 0;
              return [`${numericValue.toLocaleString()} restocks`, 'Count'];
            }}
          />
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colorStart} stopOpacity={0.9} />
              <stop offset="100%" stopColor={colorEnd} stopOpacity={0.6} />
            </linearGradient>
          </defs>
          <Bar dataKey={dataKey} fill={`url(#${gradientId})`} radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}