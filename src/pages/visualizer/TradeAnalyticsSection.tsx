import { Grid, Paper, Stack, Text, Title } from '@mantine/core';
import { ReactNode, useMemo } from 'react';
import { useSingleAlgorithm } from '../../hooks/use-single-algorithm.ts';
import { Algorithm, ResultLogTradeHistoryItem } from '../../models.ts';
import { formatNumber } from '../../utils/format.ts';
import { VisualizerCard } from './VisualizerCard.tsx';

const AVERAGE_SPREAD = 16;

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

function getMidPriceAtTrade(algorithm: Algorithm, trade: ResultLogTradeHistoryItem): number | null {
  const matchingRows = algorithm.activityLogs.filter(row => row.product === trade.symbol && row.timestamp === trade.timestamp);
  const row = matchingRows[matchingRows.length - 1];

  if (!row) {
    return null;
  }

  const bestBid = getBestPrice(row.bidPrices[0]);
  const bestAsk = getBestPrice(row.askPrices[0]);

  if (bestBid === null && bestAsk === null) {
    return Number.isFinite(row.midPrice) ? row.midPrice : null;
  }

  if (bestBid === null && bestAsk !== null) {
    return (bestAsk - AVERAGE_SPREAD + bestAsk) / 2;
  }

  if (bestBid !== null && bestAsk === null) {
    return (bestBid + bestBid + AVERAGE_SPREAD) / 2;
  }

  return Number.isFinite(row.midPrice) ? row.midPrice : ((bestBid as number) + (bestAsk as number)) / 2;
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

    const midPriceAtTrade = getMidPriceAtTrade(algorithm, trade);
    if (midPriceAtTrade === null) {
      continue;
    }

    const isPassive = (side === 'sell' && trade.price >= midPriceAtTrade) || (side === 'buy' && trade.price <= midPriceAtTrade);

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
        Passive and aggressive trades are classified exactly from trade price versus mid price at the trade timestamp,
        with the same missing-quote fallback spread of {formatNumber(AVERAGE_SPREAD)}. Trade PnL uses the last mid seen at
        a submitted trade for that product, matching your script.
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
                    hint: 'Maker volume and its share of your total submitted volume.',
                  },
                  {
                    label: 'Aggressive volume',
                    value: `${formatNumber(summary.takes)} (${formatNumber(aggressiveShare, 1)}%)`,
                    hint: 'Taker volume and its share of your total submitted volume.',
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
                    hint: 'Cash plus remaining position marked to the last trade-time mid.',
                  },
                  {
                    label: 'Spread capture',
                    value: formatNumber(summary.makerProfit, 2),
                    hint: 'PnL attributed to passive fills versus mid price.',
                  },
                  {
                    label: 'Aggression edge',
                    value: formatNumber(summary.takerLoss, 2),
                    hint: 'PnL attributed to aggressive fills versus mid price.',
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
