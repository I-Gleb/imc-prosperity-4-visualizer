import Highcharts from 'highcharts';
import { ReactNode } from 'react';
import { useSingleAlgorithm } from '../../hooks/use-single-algorithm.ts';
import { Algorithm } from '../../models.ts';
import { Chart } from './Chart.tsx';
import { getPositionLimit } from './utils.ts';

export interface PositionChartProps {
  symbols: string[];
  algorithms?: { label: string; algorithm: Algorithm }[];
}

export function PositionChart({ symbols, algorithms }: PositionChartProps): ReactNode {
  const singleAlgorithm = useSingleAlgorithm();
  const algorithmEntries = algorithms ?? [{ label: '', algorithm: singleAlgorithm! }];
  const series: Highcharts.SeriesOptionsType[] = [];

  algorithmEntries.forEach(({ label, algorithm }, algorithmIndex) => {
    const limits: Record<string, number> = {};
    for (const symbol of symbols) {
      limits[symbol] = getPositionLimit(algorithm, symbol);
    }

    const data: Record<string, [number, number][]> = {};
    for (const symbol of symbols) {
      data[symbol] = [];
    }

    for (const row of algorithm.data) {
      for (const symbol of symbols) {
        const limit = limits[symbol];
        const position = row.state.position[symbol] || 0;
        data[symbol].push([row.state.timestamp, limit === 0 ? 0 : (position / limit) * 100]);
      }
    }

    symbols.forEach((symbol, symbolIndex) => {
      series.push({
        type: 'line',
        name: label ? `${label} - ${symbol}` : symbol,
        data: data[symbol],

        // We offset the position color by 1 to make it line up with the colors in the profit / loss chart,
        // while keeping the "Total" line in the profit / loss chart the same color at all times
        colorIndex: (symbolIndex + 1) % 10,
        dashStyle: algorithmIndex === 0 ? 'Solid' : 'Dash',
      });
    });
  });

  return <Chart title="Positions (% of limit)" series={series} min={-100} max={100} />;
}
