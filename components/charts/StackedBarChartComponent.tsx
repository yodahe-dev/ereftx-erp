"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StackedData {
  name: string;
  fullName?: string;
  Boxes: number;
  Bottles: number;
  [key: string]: any;
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
  colors = { boxes: "#f97316", bottles: "#8b5cf6" },
  height = 350,
}: StackedBarChartComponentProps) {
  const boxesGradient = `url(#boxes-${title.replace(/\s/g, "")})`;
  const bottlesGradient = `url(#bottles-${title.replace(/\s/g, "")})`;

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
              contentStyle={{ backgroundColor: "#1e1e2f", borderColor: colors.boxes }}
              labelFormatter={(label) => {
                const item = data.find((d) => d.name === label);
                return item?.fullName || label;
              }}
            />
            <Legend wrapperStyle={{ color: "#fff" }} />
            <defs>
              <linearGradient id={`boxes-${title.replace(/\s/g, "")}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors.boxes} stopOpacity={0.9} />
                <stop offset="100%" stopColor="#ff9f4a" stopOpacity={0.6} />
              </linearGradient>
              <linearGradient id={`bottles-${title.replace(/\s/g, "")}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors.bottles} stopOpacity={0.9} />
                <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.6} />
              </linearGradient>
            </defs>
            <Bar dataKey="Boxes" stackId="a" fill={boxesGradient} name="Boxes" />
            <Bar dataKey="Bottles" stackId="a" fill={bottlesGradient} name="Bottles (Singles)" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}