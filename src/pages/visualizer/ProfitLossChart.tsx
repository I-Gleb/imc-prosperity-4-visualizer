import Highcharts from 'highcharts';
import { ReactNode } from 'react';
import { useSingleAlgorithm } from '../../hooks/use-single-algorithm.ts';
import { Algorithm } from '../../models.ts';
import { Chart } from './Chart.tsx';

export interface ProfitLossChartProps {
  symbols: string[];
  algorithms?: { label: string; algorithm: Algorithm }[];
}

export function ProfitLossChart({ symbols, algorithms }: ProfitLossChartProps): ReactNode {
  const singleAlgorithm = useSingleAlgorithm();
  const algorithmEntries = algorithms ?? [{ label: 'Total', algorithm: singleAlgorithm! }];
  const series: Highcharts.SeriesOptionsType[] = [];

  algorithmEntries.forEach(({ label, algorithm }) => {
    const dataByTimestamp = new Map<number, number>();
    for (const row of algorithm.activityLogs) {
      if (!dataByTimestamp.has(row.timestamp)) {
        dataByTimestamp.set(row.timestamp, row.profitLoss);
      } else {
        dataByTimestamp.set(row.timestamp, dataByTimestamp.get(row.timestamp)! + row.profitLoss);
      }
    }

    series.push({
      type: 'line',
      name: label,
      data: [...dataByTimestamp.keys()].map(timestamp => [timestamp, dataByTimestamp.get(timestamp)]),
    });
  });

  if (algorithmEntries.length === 1) {
    const algorithm = algorithmEntries[0].algorithm;

    symbols.forEach(symbol => {
      const data = [];

      for (const row of algorithm.activityLogs) {
        if (row.product === symbol) {
          data.push([row.timestamp, row.profitLoss]);
        }
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
