"use client";

import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Point = {
  label: string;
  workedMinutes: number;
  expectedMinutes: number;
  balanceMinutes: number;
};

type Props = {
  data: Point[];
};

function formatMinutesLabel(minutes: number) {
  const sign = minutes < 0 ? "-" : "";
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${h}h ${m}min`;
}

export function BankHoursTrendChart({ data }: Props) {
  const normalized = data.map((d) => ({
    label: d.label,
    workedHours: d.workedMinutes / 60,
    expectedHours: d.expectedMinutes / 60,
    balanceMinutes: d.balanceMinutes,
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="h-56 w-full"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={normalized}
          margin={{ left: -20, right: 8, top: 10, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(15,23,42,0.06)"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tick={{ fontSize: 11, fill: "rgba(15,23,42,0.6)" }}
          />
          <YAxis
            tickFormatter={(v) => `${v}h`}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tick={{ fontSize: 11, fill: "rgba(15,23,42,0.6)" }}
            domain={[0, "dataMax + 1"]}
          />
          <Tooltip
            formatter={(value: number, _name, entry) => {
              const key = entry?.dataKey as string;
              if (key === "workedHours" || key === "expectedHours") {
                const minutes = Math.round(value * 60);
                return [
                  formatMinutesLabel(minutes),
                  key === "workedHours" ? "Trabalhadas" : "Previstas",
                ];
              }
              return [formatMinutesLabel(value as number), "Saldo do dia"];
            }}
            labelFormatter={(label) => `Dia ${label}`}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid rgba(15,23,42,0.06)",
              boxShadow: "0 12px 30px rgba(15,23,42,0.12)",
              fontSize: 12,
            }}
          />
          <Legend
            formatter={(value) =>
              value === "workedHours"
                ? "Trabalhadas"
                : value === "expectedHours"
                ? "Previstas"
                : "Saldo do dia (min)"
            }
          />
          <Bar
            dataKey="expectedHours"
            fill="#e5e7eb"
            radius={[4, 4, 0, 0]}
            maxBarSize={18}
          />
          <Bar
            dataKey="workedHours"
            fill="#22c55e"
            radius={[4, 4, 0, 0]}
            maxBarSize={18}
          />
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}

