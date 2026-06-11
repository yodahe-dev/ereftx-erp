'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { motion } from 'framer-motion';

interface StackedData {
  name: string;
  fullName?: string;
  Boxes: number;
  Bottles: number;
}

interface StackedBarChartComponentProps {
  title: string;
  data: StackedData[];
  colors?: { boxes: string; bottles: string };
  height?: number;
}

export function StackedBarChartComponent({
  title,
  data,
  colors = { boxes: '#F59E0B', bottles: '#10B981' },
  height = 350,
}: StackedBarChartComponentProps) {
  const boxesId = React.useId();
  const bottlesId = React.useId();

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
            contentStyle={{ backgroundColor: '#1A1A24', borderColor: colors.boxes, borderRadius: '8px' }}
            labelFormatter={(label) => {
              const item = data.find((d) => d.name === label);
              return item?.fullName || label;
            }}
          />
          <Legend wrapperStyle={{ color: '#D1D5DB' }} />
          <defs>
            <linearGradient id={boxesId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.boxes} stopOpacity={0.9} />
              <stop offset="100%" stopColor={colors.boxes} stopOpacity={0.5} />
            </linearGradient>
            <linearGradient id={bottlesId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.bottles} stopOpacity={0.9} />
              <stop offset="100%" stopColor={colors.bottles} stopOpacity={0.5} />
            </linearGradient>
          </defs>
          <Bar dataKey="Boxes" stackId="a" fill={`url(#${boxesId})`} name="Boxes" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Bottles" stackId="a" fill={`url(#${bottlesId})`} name="Bottles (Singles)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}