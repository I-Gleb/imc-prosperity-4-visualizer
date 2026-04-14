import { Grid, Paper, Stack, Text, Title } from '@mantine/core';
import { ReactNode } from 'react';
import { ScrollableCodeHighlight } from '../../components/ScrollableCodeHighlight.tsx';
import { Algorithm, AlgorithmDataRow } from '../../models.ts';
import { formatNumber } from '../../utils/format.ts';
import { ConversionObservationsTable } from './ConversionObservationsTable.tsx';
import { ListingsTable } from './ListingsTable.tsx';
import { OrderDepthTable } from './OrderDepthTable.tsx';
import { OrdersTable } from './OrdersTable.tsx';
import { PlainValueObservationsTable } from './PlainValueObservationsTable.tsx';
import { PositionTable } from './PositionTable.tsx';
import { ProfitLossTable } from './ProfitLossTable.tsx';
import { TradesTable } from './TradesTable.tsx';

function formatTraderData(value: any): string {
  if (typeof value === 'string') {
    return value;
  }

  return JSON.stringify(value);
}

function getMidPrice(algorithm: Algorithm, timestamp: number, symbol: string): number | undefined {
  return algorithm.activityLogs.find(row => row.timestamp === timestamp && row.product === symbol)?.midPrice;
}

interface SingleTimestampDetailProps {
  mode: 'single';
  algorithm: Algorithm;
  row: AlgorithmDataRow;
}

interface ComparisonTimestampDetailProps {
  mode: 'comparison';
  timestamp: number;
  sharedRow: AlgorithmDataRow;
  strategies: {
    label: string;
    algorithm: Algorithm;
    row: AlgorithmDataRow;
  }[];
}

export type TimestampDetailProps = SingleTimestampDetailProps | ComparisonTimestampDetailProps;

function ComparisonSection({ title, children }: { title: string; children: ReactNode }): ReactNode {
  return (
    <div>
      <Title order={5} mb="xs">
        {title}
      </Title>
      {children}
    </div>
  );
}

function StrategyColumn({
  label,
  profitLoss,
  row,
  algorithm,
}: {
  label: string;
  profitLoss: number;
  row: AlgorithmDataRow;
  algorithm: Algorithm;
}): ReactNode {
  return (
    <Paper withBorder p="md" h="100%">
      <Stack gap="md">
        <div>
          <Title order={4}>{label}</Title>
          <Text c="dimmed">
            Profit / Loss: {formatNumber(profitLoss)} • Conversions: {formatNumber(row.conversions)}
          </Text>
        </div>
        <ComparisonSection title="Positions">
          <PositionTable position={row.state.position} />
        </ComparisonSection>
        <ComparisonSection title="Profit / Loss">
          <ProfitLossTable timestamp={row.state.timestamp} algorithm={algorithm} />
        </ComparisonSection>
        <ComparisonSection title="Most Recent Own trades">
          <TradesTable trades={row.state.ownTrades} />
        </ComparisonSection>
        <ComparisonSection title="Most Recent Market trades">
          <TradesTable trades={row.state.marketTrades} />
        </ComparisonSection>
        <ComparisonSection title="Orders">
          <OrdersTable orders={row.orders} />
        </ComparisonSection>
        <ComparisonSection title="Previous trader data">
          {row.state.traderData ? (
            <ScrollableCodeHighlight code={formatTraderData(row.state.traderData)} language="json" />
          ) : (
            <Text>Timestamp has no previous trader data</Text>
          )}
        </ComparisonSection>
        <ComparisonSection title="Next trader data">
          {row.traderData ? (
            <ScrollableCodeHighlight code={formatTraderData(row.traderData)} language="json" />
          ) : (
            <Text>Timestamp has no next trader data</Text>
          )}
        </ComparisonSection>
        <ComparisonSection title="Sandbox logs">
          {row.sandboxLogs ? (
            <ScrollableCodeHighlight code={row.sandboxLogs} language="markdown" />
          ) : (
            <Text>Timestamp has no sandbox logs</Text>
          )}
        </ComparisonSection>
        <ComparisonSection title="Algorithm logs">
          {row.algorithmLogs ? (
            <ScrollableCodeHighlight code={row.algorithmLogs} language="markdown" />
          ) : (
            <Text>Timestamp has no algorithm logs</Text>
          )}
        </ComparisonSection>
      </Stack>
    </Paper>
  );
}

export function TimestampDetail(props: TimestampDetailProps): ReactNode {
  if (props.mode === 'single') {
    const {
      algorithm,
      row: { state, orders, conversions, traderData, algorithmLogs, sandboxLogs },
    } = props;

    const profitLoss = algorithm.activityLogs
      .filter(activityLogRow => activityLogRow.timestamp === state.timestamp)
      .reduce((acc, val) => acc + val.profitLoss, 0);

    return (
      <Grid columns={12}>
        <Grid.Col span={12}>
          {/* prettier-ignore */}
          <Title order={5}>
            Timestamp {formatNumber(state.timestamp)} • Profit / Loss: {formatNumber(profitLoss)} •
            Conversions: {formatNumber(conversions)}
          </Title>
        </Grid.Col>
        <Grid.Col span={{ xs: 12, sm: 4 }}>
          <Title order={5}>Listings</Title>
          <ListingsTable listings={state.listings} />
        </Grid.Col>
        <Grid.Col span={{ xs: 12, sm: 4 }}>
          <Title order={5}>Positions</Title>
          <PositionTable position={state.position} />
        </Grid.Col>
        <Grid.Col span={{ xs: 12, sm: 4 }}>
          <Title order={5}>Profit / Loss</Title>
          <ProfitLossTable timestamp={state.timestamp} algorithm={algorithm} />
        </Grid.Col>
        <Grid.Col span={{ xs: 12, sm: 4 }}>
          <Title order={5}>Most Recent Own trades</Title>
          <TradesTable trades={state.ownTrades} />
        </Grid.Col>
        {Object.entries(state.orderDepths).map(([symbol, orderDepth], i) => (
          <Grid.Col key={i} span={{ xs: 12, sm: 4 }}>
            <Title order={5}>{symbol} order depth</Title>
            <OrderDepthTable orderDepth={orderDepth} midPrice={getMidPrice(algorithm, state.timestamp, symbol)} />
          </Grid.Col>
        ))}
        {Object.keys(state.orderDepths).length % 3 <= 2 && <Grid.Col span={{ xs: 12, sm: 4 }} />}
        {Object.keys(state.orderDepths).length % 3 <= 1 && <Grid.Col span={{ xs: 12, sm: 4 }} />}
        <Grid.Col span={{ xs: 12, sm: 4 }}>
          <Title order={5}>Most Recent Market trades</Title>
          <TradesTable trades={state.marketTrades} />
        </Grid.Col>
        <Grid.Col span={{ xs: 12, sm: 4 }}>
          <Title order={5}>Orders</Title>
          <OrdersTable orders={orders} />
        </Grid.Col>
        <Grid.Col span={{ xs: 12, sm: 4 }}>
          <Title order={5}>Plain value observations</Title>
          <PlainValueObservationsTable plainValueObservations={state.observations.plainValueObservations} />
        </Grid.Col>
        <Grid.Col span={{ xs: 12, sm: 8 }}>
          <Title order={5}>Conversion observations</Title>
          <ConversionObservationsTable conversionObservations={state.observations.conversionObservations} />
        </Grid.Col>
        <Grid.Col span={{ xs: 12, sm: 6 }}>
          <Title order={5}>Sandbox logs</Title>
          {sandboxLogs ? (
            <ScrollableCodeHighlight code={sandboxLogs} language="markdown" />
          ) : (
            <Text>Timestamp has no sandbox logs</Text>
          )}
        </Grid.Col>
        <Grid.Col span={{ xs: 12, sm: 6 }}>
          <Title order={5}>Algorithm logs</Title>
          {algorithmLogs ? (
            <ScrollableCodeHighlight code={algorithmLogs} language="markdown" />
          ) : (
            <Text>Timestamp has no algorithm logs</Text>
          )}
        </Grid.Col>
        <Grid.Col span={{ xs: 12, sm: 6 }}>
          <Title order={5}>Previous trader data</Title>
          {state.traderData ? (
            <ScrollableCodeHighlight code={formatTraderData(state.traderData)} language="json" />
          ) : (
            <Text>Timestamp has no previous trader data</Text>
          )}
        </Grid.Col>
        <Grid.Col span={{ xs: 12, sm: 6 }}>
          <Title order={5}>Next trader data</Title>
          {traderData ? (
            <ScrollableCodeHighlight code={formatTraderData(traderData)} language="json" />
          ) : (
            <Text>Timestamp has no next trader data</Text>
          )}
        </Grid.Col>
      </Grid>
    );
  }

  const { timestamp, sharedRow, strategies } = props;
  const left = strategies[0]!;
  const right = strategies[1]!;

  const leftProfitLoss = left.algorithm.activityLogs
    .filter(activityLogRow => activityLogRow.timestamp === left.row.state.timestamp)
    .reduce((acc, val) => acc + val.profitLoss, 0);
  const rightProfitLoss = right.algorithm.activityLogs
    .filter(activityLogRow => activityLogRow.timestamp === right.row.state.timestamp)
    .reduce((acc, val) => acc + val.profitLoss, 0);

  return (
    <Grid columns={12}>
      <Grid.Col span={12}>
        <Title order={5}>Timestamp {formatNumber(timestamp)}</Title>
      </Grid.Col>
      <Grid.Col span={12}>
        <Title order={4}>Shared Market Data</Title>
      </Grid.Col>
      {Object.entries(sharedRow.state.orderDepths).map(([symbol, orderDepth], i) => (
        <Grid.Col key={i} span={{ xs: 12, sm: 4 }}>
          <Title order={5}>{symbol} order depth</Title>
          <OrderDepthTable orderDepth={orderDepth} midPrice={getMidPrice(left.algorithm, timestamp, symbol)} />
        </Grid.Col>
      ))}
      {Object.keys(sharedRow.state.orderDepths).length % 3 <= 2 && <Grid.Col span={{ xs: 12, sm: 4 }} />}
      {Object.keys(sharedRow.state.orderDepths).length % 3 <= 1 && <Grid.Col span={{ xs: 12, sm: 4 }} />}
      <Grid.Col span={{ xs: 12, sm: 4 }}>
        <Title order={5}>Plain value observations</Title>
        <PlainValueObservationsTable plainValueObservations={sharedRow.state.observations.plainValueObservations} />
      </Grid.Col>
      <Grid.Col span={{ xs: 12, sm: 8 }}>
        <Title order={5}>Conversion observations</Title>
        <ConversionObservationsTable conversionObservations={sharedRow.state.observations.conversionObservations} />
      </Grid.Col>
      <Grid.Col span={12}>
        <Title order={4}>Strategy Snapshots</Title>
      </Grid.Col>
      <Grid.Col span={{ xs: 12, sm: 6 }}>
        <StrategyColumn label={left.label} profitLoss={leftProfitLoss} row={left.row} algorithm={left.algorithm} />
      </Grid.Col>
      <Grid.Col span={{ xs: 12, sm: 6 }}>
        <StrategyColumn label={right.label} profitLoss={rightProfitLoss} row={right.row} algorithm={right.algorithm} />
      </Grid.Col>
    </Grid>
  );
}
