'use client'

import { useMemo } from 'react'
import {
  ResponsiveContainer,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Area,
  ComposedChart,
} from 'recharts'
import { format, parseISO } from 'date-fns'

interface DataPoint {
  date: string
  value: number
}

interface Props {
  data: DataPoint[]
  dataKey: string
  label: string
  color: string
  unit: string
}

export default function GrowthChart({ data, dataKey, label, color, unit }: Props) {
  const chartData = useMemo(
    () => data.map((d) => ({
      date: d.date,
      [dataKey]: d.value,
      formattedDate: format(parseISO(d.date), 'MMM yyyy'),
    })),
    [data, dataKey]
  )

  return (
    <div className="bg-white rounded-2xl border border-warm-200 shadow-sm p-6">
      <h3 className="font-accent text-lg text-warm-800 mb-4">{label}</h3>
      <div className="h-64" role="img" aria-label={`${label} chart showing ${data.length} data points in ${unit}`}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F5ECDB" />
            <XAxis
              dataKey="formattedDate"
              tick={{ fontSize: 12, fill: '#A89060' }}
              tickLine={false}
              axisLine={{ stroke: '#F5ECDB' }}
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#A89060' }}
              tickLine={false}
              axisLine={{ stroke: '#F5ECDB' }}
              unit={` ${unit}`}
              width={70}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#FFFDF7',
                border: '1px solid #F5ECDB',
                borderRadius: '12px',
                fontSize: '13px',
              }}
              formatter={(value: unknown) => [`${value} ${unit}`, label]}
              labelFormatter={(label: unknown) => String(label)}
            />
            <Area
              type="monotone"
              dataKey={dataKey}
              fill={color}
              fillOpacity={0.1}
              stroke="none"
            />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2}
              dot={{ fill: color, strokeWidth: 2, r: 4, stroke: '#fff' }}
              activeDot={{ r: 6, stroke: color, strokeWidth: 2, fill: '#fff' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
