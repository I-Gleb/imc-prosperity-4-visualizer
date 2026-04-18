import { SegmentedControl, Slider, Stack, Text } from '@mantine/core';
import Highcharts from 'highcharts';
import { ReactNode, useMemo, useState } from 'react';
import { useSingleAlgorithm } from '../../hooks/use-single-algorithm.ts';
import { Algorithm, ProsperitySymbol } from '../../models.ts';
import { getAskColor, getBidColor } from '../../utils/colors.ts';
import { formatNumber } from '../../utils/format.ts';
import { Chart } from './Chart.tsx';
import { getPositionLimit } from './utils.ts';

type ViewMode = 'overlay' | 'trajectory' | 'accumulation';

const ACCUMULATION_GRANULARITY_OPTIONS = [
  { label: '1', value: '1' },
  { label: '2', value: '2' },
  { label: '5', value: '5' },
  { label: '10', value: '10' },
  { label: '20', value: '20' },
];

interface PositionPricePoint {
  timestamp: number;
  midPrice: number;
  position: number;
  positionPercent: number;
  positionDelta: number;
}

interface PositionPriceChartProps {
  symbol: ProsperitySymbol;
  algorithm?: Algorithm;
  title?: string;
}

function hasVisiblePriceData(row: Algorithm['activityLogs'][number]): boolean {
  if (Number.isFinite(row.midPrice) && row.midPrice !== 0) {
    return true;
  }

  return row.bidPrices.some(Number.isFinite) || row.askPrices.some(Number.isFinite);
}

function positionTooltip(this: Highcharts.Point): string {
  const point = (this as any).custom as PositionPricePoint | undefined;
  if (!point) {
    return '';
  }

  return (
    `<span style="color:${this.color}">\u25CF</span> Position: <b>${formatNumber(point.position)}</b>` +
    ` (${formatNumber(point.positionPercent)}% of limit)<br/>`
  );
}

function priceTooltip(this: Highcharts.Point): string {
  return `<span style="color:${this.color}">\u25CF</span> Mid price: <b>${formatNumber(this.y as number)}</b><br/>`;
}

function pointDetailsTooltip(label: string, icon: string) {
  return function pointFormatter(this: Highcharts.Point): string {
    const point = (this as any).custom as PositionPricePoint | undefined;
    if (!point) {
      return '';
    }

    const deltaLabel =
      point.positionDelta === 0 ? 'unchanged' : `${point.positionDelta > 0 ? '+' : ''}${formatNumber(point.positionDelta)}`;

    return (
      `<span style="color:${this.color}">${icon}</span> ${label}<br/>` +
      `Timestamp: <b>${formatNumber(point.timestamp)}</b><br/>` +
      `Mid price: <b>${formatNumber(point.midPrice)}</b><br/>` +
      `Position: <b>${formatNumber(point.position)}</b> (${formatNumber(point.positionPercent)}% of limit)<br/>` +
      `Position change: <b>${deltaLabel}</b><br/>`
    );
  };
}

export function PositionPriceChart({
  symbol,
  algorithm: providedAlgorithm,
  title,
}: PositionPriceChartProps): ReactNode {
  const algorithm = providedAlgorithm ?? useSingleAlgorithm()!;
  const [viewMode, setViewMode] = useState<ViewMode>('overlay');
  const [trajectoryPrefixLength, setTrajectoryPrefixLength] = useState<number | null>(null);
  const [accumulationGranularity, setAccumulationGranularity] = useState('1');
  const positionLimit = useMemo(() => getPositionLimit(algorithm, symbol), [algorithm, symbol]);

  const points = useMemo((): PositionPricePoint[] => {
    const positionsByTimestamp = new Map<number, number>();
    for (const row of algorithm.data) {
      positionsByTimestamp.set(row.state.timestamp, row.state.position[symbol] || 0);
    }

    const symbolRows = algorithm.activityLogs.filter(row => row.product === symbol && hasVisiblePriceData(row));
    const data: PositionPricePoint[] = [];
    let previousPosition: number | undefined;

    for (const row of symbolRows) {
      const position = positionsByTimestamp.get(row.timestamp) ?? previousPosition ?? 0;
      const positionPercent = positionLimit === 0 ? 0 : (position / positionLimit) * 100;
      const positionDelta = previousPosition === undefined ? 0 : position - previousPosition;

      data.push({
        timestamp: row.timestamp,
        midPrice: row.midPrice,
        position,
        positionPercent,
        positionDelta,
      });

      previousPosition = position;
    }

    return data;
  }, [algorithm, symbol, positionLimit]);

  const effectiveTrajectoryPrefixLength = trajectoryPrefixLength ?? points.length;
  const trajectoryPoints = points.slice(0, effectiveTrajectoryPrefixLength);

  const viewDescription =
    viewMode === 'overlay'
      ? 'Best for timing: mid price and position share the same timeline.'
      : viewMode === 'trajectory'
        ? 'Best for behavior: shows whether inventory grows into weakness or strength.'
        : 'Best for levels: buckets net inventory changes by price to reveal where size was added or reduced.';

  let chartTitle = title ?? `${symbol} - Position vs Price`;
  let series: Highcharts.SeriesOptionsType[] = [];
  let options: Highcharts.Options = {};
  let constructorType: 'chart' | 'stockChart' = 'stockChart';
  let useTimestampXAxis = true;

  if (viewMode === 'overlay') {
    const midPriceData: Highcharts.PointOptionsObject[] = points.map(point => ({
      x: point.timestamp,
      y: point.midPrice,
      custom: point,
    }));
    const positionData: Highcharts.PointOptionsObject[] = points.map(point => ({
      x: point.timestamp,
      y: point.positionPercent,
      custom: point,
    }));

    chartTitle = title ?? `${symbol} - Position vs Price (Timeline)`;
    options = {
      yAxis: [
        {
          title: {
            text: 'Price',
          },
          allowDecimals: true,
        },
        {
          title: {
            text: 'Position (% of limit)',
          },
          opposite: true,
          min: -100,
          max: 100,
          gridLineWidth: 0,
          plotLines: [
            {
              value: 0,
              color: 'rgba(128, 128, 128, 0.45)',
              width: 1,
              zIndex: 2,
            },
          ],
        },
      ],
      legend: {
        enabled: true,
      },
    };

    series = [
      {
        type: 'line',
        name: 'Mid price',
        color: 'rgba(52, 152, 219, 0.95)',
        data: midPriceData,
        lineWidth: 2,
        marker: { enabled: false },
        tooltip: {
          pointFormatter: priceTooltip,
        },
      },
      {
        type: 'area',
        name: 'Position',
        yAxis: 1,
        data: positionData,
        step: 'left',
        lineWidth: 2,
        marker: { enabled: false },
        tooltip: {
          pointFormatter: positionTooltip,
        },
        zones: [
          {
            value: 0,
            color: getAskColor(0.9),
            fillColor: getAskColor(0.15),
          },
          {
            color: getBidColor(0.9),
            fillColor: getBidColor(0.15),
          },
        ],
      },
    ];
  } else if (viewMode === 'trajectory') {
    constructorType = 'chart';
    useTimestampXAxis = false;
    chartTitle = title ?? `${symbol} - Position vs Price (Trajectory)`;

    const pathData: Highcharts.PointOptionsObject[] = trajectoryPoints.map(point => ({
      x: point.midPrice,
      y: point.positionPercent,
      custom: point,
    }));
    const addedInventoryData = trajectoryPoints
      .filter(point => point.positionDelta > 0)
      .map(point => ({
        x: point.midPrice,
        y: point.positionPercent,
        custom: point,
      }));
    const reducedInventoryData = trajectoryPoints
      .filter(point => point.positionDelta < 0)
      .map(point => ({
        x: point.midPrice,
        y: point.positionPercent,
        custom: point,
      }));

    const startPoint = trajectoryPoints[0];
    const endPoint = trajectoryPoints[trajectoryPoints.length - 1];

    options = {
      xAxis: {
        title: {
          text: 'Mid price',
        },
        labels: {
          formatter: (params: Highcharts.AxisLabelsFormatterContextObject) => formatNumber(params.value as number),
        },
      },
      yAxis: {
        title: {
          text: 'Position (% of limit)',
        },
        min: -100,
        max: 100,
        plotLines: [
          {
            value: 0,
            color: 'rgba(128, 128, 128, 0.45)',
            width: 1,
            zIndex: 2,
          },
        ],
      },
      tooltip: {
        shared: false,
      },
    };

    series = [
      {
        type: 'line',
        name: 'Inventory path',
        color: 'rgba(52, 152, 219, 0.8)',
        data: pathData,
        lineWidth: 2,
        marker: { enabled: false },
        tooltip: {
          pointFormatter: pointDetailsTooltip('Path', '\u25CF'),
        },
      },
      {
        type: 'scatter',
        name: 'Added inventory',
        color: getBidColor(0.95),
        data: addedInventoryData,
        marker: { symbol: 'triangle', radius: 6 },
        tooltip: {
          pointFormatter: pointDetailsTooltip('Added inventory', '\u25B2'),
        },
      },
      {
        type: 'scatter',
        name: 'Reduced inventory',
        color: getAskColor(0.95),
        data: reducedInventoryData,
        marker: { symbol: 'triangle-down', radius: 6 },
        tooltip: {
          pointFormatter: pointDetailsTooltip('Reduced inventory', '\u25BC'),
        },
      },
      ...(startPoint
        ? [
            {
              type: 'scatter',
              name: 'Start',
              color: 'rgba(52, 152, 219, 1)',
              data: [{ x: startPoint.midPrice, y: startPoint.positionPercent, custom: startPoint }],
              marker: { symbol: 'circle', radius: 5, lineWidth: 2, lineColor: 'white' },
              tooltip: {
                pointFormatter: pointDetailsTooltip('Start', '\u25CB'),
              },
            } satisfies Highcharts.SeriesScatterOptions,
          ]
        : []),
      ...(endPoint
        ? [
            {
              type: 'scatter',
              name: 'End',
              color: 'rgba(52, 73, 94, 1)',
              data: [{ x: endPoint.midPrice, y: endPoint.positionPercent, custom: endPoint }],
              marker: { symbol: 'diamond', radius: 6 },
              tooltip: {
                pointFormatter: pointDetailsTooltip('End', '\u25C6'),
              },
            } satisfies Highcharts.SeriesScatterOptions,
          ]
        : []),
    ];
  } else {
    constructorType = 'chart';
    useTimestampXAxis = false;
    chartTitle = title ?? `${symbol} - Position vs Price (Accumulation)`;

    const bucketSize = Number(accumulationGranularity) || 1;
    const bucketedDeltas = new Map<number, { delta: number; samples: number }>();

    for (const point of points) {
      if (point.positionDelta === 0) continue;

      const bucket = Math.round(point.midPrice / bucketSize) * bucketSize;
      const current = bucketedDeltas.get(bucket) ?? { delta: 0, samples: 0 };
      current.delta += point.positionDelta;
      current.samples += 1;
      bucketedDeltas.set(bucket, current);
    }

    options = {
      xAxis: {
        title: {
          text: 'Mid price bucket',
        },
        labels: {
          formatter: (params: Highcharts.AxisLabelsFormatterContextObject) => formatNumber(params.value as number),
        },
      },
      yAxis: {
        title: {
          text: 'Net position change',
        },
        plotLines: [
          {
            value: 0,
            color: 'rgba(128, 128, 128, 0.45)',
            width: 1,
            zIndex: 2,
          },
        ],
      },
      tooltip: {
        shared: false,
      },
    };

    series = [
      {
        type: 'column',
        name: 'Net position change',
        data: [...bucketedDeltas.entries()]
          .sort(([leftPrice], [rightPrice]) => leftPrice - rightPrice)
          .map(([price, bucket]) => ({
            x: price,
            y: bucket.delta,
            color: bucket.delta >= 0 ? getBidColor(0.85) : getAskColor(0.85),
            custom: {
              priceLow: price - bucketSize / 2,
              priceHigh: price + bucketSize / 2,
              samples: bucket.samples,
            },
          })),
        pointRange: bucketSize * 0.9,
        tooltip: {
          pointFormatter(this: Highcharts.Point) {
            const custom = (this as any).custom;
            return (
              `<span style="color:${this.color}">\u25A0</span> Price band: <b>${formatNumber(custom.priceLow)} - ` +
              `${formatNumber(custom.priceHigh)}</b><br/>` +
              `Net position change: <b>${this.y && this.y > 0 ? '+' : ''}${formatNumber(this.y as number)}</b><br/>` +
              `Position updates: <b>${formatNumber(custom.samples)}</b><br/>`
            );
          },
        },
      },
    ];
  }

  const trajectoryMin = points.length === 0 ? 0 : 1;
  const trajectoryMax = points.length;
  const trajectoryCurrentPoint =
    trajectoryPoints.length > 0 ? trajectoryPoints[trajectoryPoints.length - 1] : undefined;

  const controls = (
    <Stack gap={4}>
      <SegmentedControl
        size="xs"
        value={viewMode}
        onChange={value => setViewMode(value as ViewMode)}
        data={[
          { label: 'Overlay', value: 'overlay' },
          { label: 'Trajectory', value: 'trajectory' },
          { label: 'Accumulation', value: 'accumulation' },
        ]}
      />
      <Text size="sm" c="dimmed">
        {viewDescription}
      </Text>
      {viewMode === 'trajectory' && trajectoryMax > 0 && (
        <div>
          <Text size="xs" c="dimmed" mb={4}>
            Prefix ending at timestamp {formatNumber(trajectoryCurrentPoint?.timestamp ?? points[0]?.timestamp ?? 0)}
          </Text>
          <Slider
            min={trajectoryMin}
            max={trajectoryMax}
            step={1}
            value={effectiveTrajectoryPrefixLength}
            onChange={setTrajectoryPrefixLength}
            label={value => formatNumber(points[value - 1]?.timestamp ?? 0)}
          />
        </div>
      )}
      {viewMode === 'accumulation' && (
        <div>
          <Text size="xs" c="dimmed" mb={4}>
            Price grouping
          </Text>
          <SegmentedControl
            size="xs"
            value={accumulationGranularity}
            onChange={setAccumulationGranularity}
            data={ACCUMULATION_GRANULARITY_OPTIONS}
          />
        </div>
      )}
    </Stack>
  );

  return (
    <Chart
      title={chartTitle}
      series={series}
      options={options}
      controls={controls}
      constructorType={constructorType}
      useTimestampXAxis={useTimestampXAxis}
    />
  );
}
