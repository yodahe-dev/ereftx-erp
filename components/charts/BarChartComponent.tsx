"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  colorStart = "#10b981",
  colorEnd = "#06b6d4",
  height = 300,
}: BarChartComponentProps) {
  const gradientId = `gradient-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <Card className="bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6 lg:p-8 transition-all">
      <CardHeader>
        <CardTitle className="text-white text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis
              dataKey="name"
              angle={-45}
              textAnchor="end"
              height={70}
              tick={{ fill: "#aaa", fontSize: 11 }}
            />
            <YAxis stroke="#aaa" />
            <Tooltip
              contentStyle={{ backgroundColor: "#1e1e2f", borderColor: colorStart }}
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
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}