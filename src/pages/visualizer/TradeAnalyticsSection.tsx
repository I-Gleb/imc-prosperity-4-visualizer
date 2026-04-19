import { Grid, Paper, Stack, Text, Title } from '@mantine/core';
import { ReactNode, useMemo } from 'react';
import { useSingleAlgorithm } from '../../hooks/use-single-algorithm.ts';
import { Algorithm } from '../../models.ts';
import { formatNumber } from '../../utils/format.ts';
import { VisualizerCard } from './VisualizerCard.tsx';

const EMA_SPAN = 20;
const EMA_ALPHA = 2 / (EMA_SPAN + 1);
const INITIAL_SPREAD_ESTIMATE = 16;

interface TradeAnalyticsSummary {
  totalTrades: number;
  totalTradingVolume: number;
  outsideTradingVolume: number;
  fills: number;
  takes: number;
  passiveTradeCount: number;
  aggressiveTradeCount: number;
  cash: number;
  position: number;
  makerProfit: number;
  takerLoss: number;
  lastMidPriceAtTrade: number | null;
}

function createSummary(): TradeAnalyticsSummary {
  return {
    totalTrades: 0,
    totalTradingVolume: 0,
    outsideTradingVolume: 0,
    fills: 0,
    takes: 0,
    passiveTradeCount: 0,
    aggressiveTradeCount: 0,
    cash: 0,
    position: 0,
    makerProfit: 0,
    takerLoss: 0,
    lastMidPriceAtTrade: null,
  };
}

function getBestPrice(value: number | undefined): number | null {
  return Number.isFinite(value) ? (value as number) : null;
}

function updateEma(previous: number | null, sample: number | null): number | null {
  if (sample === null || !Number.isFinite(sample)) {
    return previous;
  }

  if (previous === null) {
    return sample;
  }

  return previous + EMA_ALPHA * (sample - previous);
}

function getObservedMidPrice(
  row: Algorithm['activityLogs'][number],
  bestBid: number | null,
  bestAsk: number | null,
  spreadEstimate: number,
): number | null {
  if (Number.isFinite(row.midPrice) && row.midPrice !== 0) {
    return row.midPrice;
  }

  if (bestBid !== null && bestAsk !== null) {
    return (bestBid + bestAsk) / 2;
  }

  if (bestBid === null && bestAsk !== null) {
    return bestAsk - spreadEstimate / 2;
  }

  if (bestBid !== null && bestAsk === null) {
    return bestBid + spreadEstimate / 2;
  }

  return null;
}

function buildTradePriceReferences(algorithm: Algorithm): Map<string, { emaMid: number | null; emaSpread: number }> {
  const references = new Map<string, { emaMid: number | null; emaSpread: number }>();
  const stateByProduct = new Map<string, { emaMid: number | null; emaSpread: number | null }>();

  for (const row of algorithm.activityLogs) {
    const currentState = stateByProduct.get(row.product) ?? {
      emaMid: null,
      emaSpread: null,
    };

    const bestBid = getBestPrice(row.bidPrices[0]);
    const bestAsk = getBestPrice(row.askPrices[0]);
    const observedSpread = bestBid !== null && bestAsk !== null ? bestAsk - bestBid : null;
    const emaSpread = updateEma(currentState.emaSpread, observedSpread) ?? INITIAL_SPREAD_ESTIMATE;
    const observedMidPrice = getObservedMidPrice(row, bestBid, bestAsk, emaSpread);
    const emaMid = updateEma(currentState.emaMid, observedMidPrice);

    stateByProduct.set(row.product, { emaMid, emaSpread });
    references.set(`${row.product}:${row.timestamp}`, { emaMid, emaSpread });
  }

  return references;
}

function getTotalPnl(summary: TradeAnalyticsSummary): number {
  return summary.cash + summary.position * (summary.lastMidPriceAtTrade ?? 0);
}

function getTotalEdge(summary: TradeAnalyticsSummary): number {
  return summary.makerProfit + summary.takerLoss;
}

function getMarketMovementProfit(summary: TradeAnalyticsSummary): number {
  return getTotalPnl(summary) - summary.makerProfit - summary.takerLoss;
}

function divideOrZero(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : numerator / denominator;
}

function summarizeTrades(algorithm: Algorithm): Record<string, TradeAnalyticsSummary> {
  const summaryByProduct: Record<string, TradeAnalyticsSummary> = {};
  const tradePriceReferences = buildTradePriceReferences(algorithm);

  for (const trade of algorithm.tradeHistory) {
    const summary = (summaryByProduct[trade.symbol] ??= createSummary());

    let side: 'buy' | 'sell' | null = null;
    if (trade.seller === 'SUBMISSION') {
      side = 'sell';
    } else if (trade.buyer === 'SUBMISSION') {
      side = 'buy';
    }

    if (side === null) {
      summary.outsideTradingVolume += trade.quantity;
      continue;
    }

    const tradePriceReference = tradePriceReferences.get(`${trade.symbol}:${trade.timestamp}`);
    const midPriceAtTrade = tradePriceReference?.emaMid ?? null;
    const spreadAtTrade = tradePriceReference?.emaSpread ?? INITIAL_SPREAD_ESTIMATE;
    if (midPriceAtTrade === null) {
      continue;
    }

    const quarterSpread = spreadAtTrade / 4;
    const passiveBuyThreshold = midPriceAtTrade - quarterSpread;
    const passiveSellThreshold = midPriceAtTrade + quarterSpread;
    const isPassive =
      (side === 'sell' && trade.price >= passiveSellThreshold) || (side === 'buy' && trade.price <= passiveBuyThreshold);

    summary.totalTrades += 1;
    summary.totalTradingVolume += trade.quantity;
    summary.lastMidPriceAtTrade = midPriceAtTrade;

    if (isPassive) {
      summary.fills += trade.quantity;
      summary.passiveTradeCount += 1;
      summary.makerProfit +=
        side === 'buy' ? (midPriceAtTrade - trade.price) * trade.quantity : (trade.price - midPriceAtTrade) * trade.quantity;
    } else {
      summary.takes += trade.quantity;
      summary.aggressiveTradeCount += 1;
      summary.takerLoss +=
        side === 'buy' ? (midPriceAtTrade - trade.price) * trade.quantity : (trade.price - midPriceAtTrade) * trade.quantity;
    }

    summary.cash += side === 'sell' ? trade.price * trade.quantity : -trade.price * trade.quantity;
    summary.position += side === 'sell' ? -trade.quantity : trade.quantity;
  }

  return summaryByProduct;
}

function MetricTile({ label, value, hint }: { label: string; value: string; hint?: string }): ReactNode {
  return (
    <Grid.Col span={{ xs: 12, sm: 6 }}>
      <Paper withBorder p="sm" radius="md" h="100%">
        <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
          {label}
        </Text>
        <Text size="xl" fw={700}>
          {value}
        </Text>
        {hint && (
          <Text size="sm" c="dimmed" mt={4}>
            {hint}
          </Text>
        )}
      </Paper>
    </Grid.Col>
  );
}

function MetricGroup({
  title,
  metrics,
}: {
  title: string;
  metrics: { label: string; value: string; hint?: string }[];
}): ReactNode {
  return (
    <Grid.Col span={{ xs: 12, md: 6 }}>
      <Title order={5} mb="xs">
        {title}
      </Title>
      <Grid>
        {metrics.map(metric => (
          <MetricTile key={metric.label} label={metric.label} value={metric.value} hint={metric.hint} />
        ))}
      </Grid>
    </Grid.Col>
  );
}

export function TradeAnalyticsSection(): ReactNode {
  const algorithm = useSingleAlgorithm()!;

  const summaries = useMemo(() => {
    const summaryByProduct = summarizeTrades(algorithm);
    return Object.entries(summaryByProduct).sort(([left], [right]) => left.localeCompare(right));
  }, [algorithm]);

  if (summaries.length === 0) {
    return (
      <VisualizerCard title="Trade analytics">
        <Text>No trade history is available for this run.</Text>
      </VisualizerCard>
    );
  }

  return (
    <Stack>
      <Text size="sm" c="dimmed">
        Passive and aggressive trades are classified from trade price versus an EMA fair-value band at the trade
        timestamp: passive fills sit outside EMA mid plus or minus one quarter of EMA spread, while trades at or inside
        the band count as aggressive. Missing quotes use an EMA spread estimate, seeded with{' '}
        {formatNumber(INITIAL_SPREAD_ESTIMATE)} and smoothed with EMA span {formatNumber(EMA_SPAN)}.
      </Text>
      {summaries.map(([product, summary]) => {
        const totalPnl = getTotalPnl(summary);
        const totalEdge = getTotalEdge(summary);
        const marketMovementProfit = getMarketMovementProfit(summary);
        const passiveShare = divideOrZero(summary.fills, summary.totalTradingVolume) * 100;
        const aggressiveShare = divideOrZero(summary.takes, summary.totalTradingVolume) * 100;

        return (
          <VisualizerCard key={product} title={`${product} trade analytics`}>
            <Grid>
              <MetricGroup
                title="Flow"
                metrics={[
                  {
                    label: 'Own trades',
                    value: formatNumber(summary.totalTrades),
                    hint: 'Count of trade events involving your submission.',
                  },
                  {
                    label: 'Own volume',
                    value: formatNumber(summary.totalTradingVolume),
                    hint: 'Total filled quantity across all of your trades.',
                  },
                  {
                    label: 'External market volume',
                    value: formatNumber(summary.outsideTradingVolume),
                    hint: 'Quantity traded by the rest of the market in this product.',
                  },
                  {
                    label: 'Average trade size',
                    value: formatNumber(divideOrZero(summary.totalTradingVolume, summary.totalTrades), 2),
                    hint: 'Average filled quantity per one of your trade events.',
                  },
                ]}
              />
              <MetricGroup
                title="Execution"
                metrics={[
                  {
                    label: 'Passive volume',
                    value: `${formatNumber(summary.fills)} (${formatNumber(passiveShare, 1)}%)`,
                    hint: 'Volume filled outside the EMA mid plus or minus quarter-spread band.',
                  },
                  {
                    label: 'Aggressive volume',
                    value: `${formatNumber(summary.takes)} (${formatNumber(aggressiveShare, 1)}%)`,
                    hint: 'Volume filled at or inside the EMA mid plus or minus quarter-spread band.',
                  },
                  {
                    label: 'Passive fills',
                    value: formatNumber(summary.passiveTradeCount),
                    hint: 'Number of your passive executions.',
                  },
                  {
                    label: 'Aggressive fills',
                    value: formatNumber(summary.aggressiveTradeCount),
                    hint: 'Number of your aggressive executions.',
                  },
                ]}
              />
              <MetricGroup
                title="PnL Attribution"
                metrics={[
                  {
                    label: 'Trade PnL',
                    value: formatNumber(totalPnl, 2),
                    hint: 'Cash plus remaining position marked to the last trade-time EMA mid.',
                  },
                  {
                    label: 'Spread capture',
                    value: formatNumber(summary.makerProfit, 2),
                    hint: 'PnL attributed to passive fills versus the EMA mid price.',
                  },
                  {
                    label: 'Aggression edge',
                    value: formatNumber(summary.takerLoss, 2),
                    hint: 'PnL attributed to aggressive fills versus the EMA mid price.',
                  },
                  {
                    label: 'Market movement',
                    value: formatNumber(marketMovementProfit, 2),
                    hint: 'Residual PnL after subtracting spread capture and aggression edge.',
                  },
                ]}
              />
              <MetricGroup
                title="Unit Economics"
                metrics={[
                  {
                    label: 'Average per trade',
                    value: formatNumber(divideOrZero(totalEdge, summary.totalTrades), 2),
                    hint: 'Average spread capture plus aggression edge per own trade.',
                  },
                  {
                    label: 'Average per unit',
                    value: formatNumber(divideOrZero(totalEdge, summary.totalTradingVolume), 2),
                    hint: 'Average spread capture plus aggression edge per traded unit.',
                  },
                  {
                    label: 'Average maker unit',
                    value: formatNumber(divideOrZero(summary.makerProfit, summary.fills), 2),
                    hint: 'Average spread capture per passive traded unit.',
                  },
                  {
                    label: 'Average taker unit',
                    value: formatNumber(divideOrZero(summary.takerLoss, summary.takes), 2),
                    hint: 'Average aggression edge per aggressive traded unit.',
                  },
                ]}
              />
            </Grid>
          </VisualizerCard>
        );
      })}
    </Stack>
  );
}
