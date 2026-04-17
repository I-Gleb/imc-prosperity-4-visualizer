import Highcharts from 'highcharts';
import { ReactNode } from 'react';
import { useSingleAlgorithm } from '../../hooks/use-single-algorithm.ts';
import { Algorithm } from '../../models.ts';
import { Chart } from './Chart.tsx';

export interface ProfitLossChartProps {
  symbols: string[];
  algorithms?: { label: string; algorithm: Algorithm }[];
}

function hasValidProfitLossPoint(row: Algorithm['activityLogs'][number]): boolean {
  const hasVisibleMidPrice = Number.isFinite(row.midPrice) && row.midPrice !== 0;
  return hasVisibleMidPrice;
}

export function ProfitLossChart({ symbols, algorithms }: ProfitLossChartProps): ReactNode {
  const singleAlgorithm = useSingleAlgorithm();
  const algorithmEntries = algorithms ?? [{ label: 'Total', algorithm: singleAlgorithm! }];
  const series: Highcharts.SeriesOptionsType[] = [];

  algorithmEntries.forEach(({ label, algorithm }) => {
    const dataByTimestamp = new Map<number, number>();
    for (const row of algorithm.activityLogs) {
      if (!hasValidProfitLossPoint(row)) continue;

      if (!dataByTimestamp.has(row.timestamp)) {
        dataByTimestamp.set(row.timestamp, row.profitLoss);
      } else {
        dataByTimestamp.set(row.timestamp, dataByTimestamp.get(row.timestamp)! + row.profitLoss);
      }
    }

    series.push({
      type: 'line',
      name: label,
      data: [...dataByTimestamp.entries()]
        .sort(([leftTimestamp], [rightTimestamp]) => leftTimestamp - rightTimestamp)
        .map(([timestamp, profitLoss]) => [timestamp, profitLoss]),
    });
  });

  if (algorithmEntries.length === 1) {
    const algorithm = algorithmEntries[0].algorithm;

    symbols.forEach(symbol => {
      const data: [number, number][] = [];

      for (const row of algorithm.activityLogs) {
        if (row.product !== symbol) continue;
        if (!hasValidProfitLossPoint(row)) continue;

        data.push([row.timestamp, row.profitLoss]);
      }

      series.push({
        type: 'line',
        name: symbol,
        data,
        dashStyle: 'Dash',
      });
    });
  }

  return <Chart title="Profit / Loss" series={series} />;
}
