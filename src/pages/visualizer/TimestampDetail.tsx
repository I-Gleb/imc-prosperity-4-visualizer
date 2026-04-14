import { Grid, Text, Title } from '@mantine/core';
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

function StrategySection({
  label,
  title,
  children,
}: {
  label: string;
  title: string;
  children: ReactNode;
}): ReactNode {
  return (
    <Grid.Col span={{ xs: 12, sm: 6 }}>
      <Title order={5}>
        {label} {title}
      </Title>
      {children}
    </Grid.Col>
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
      <StrategySection
        label={left.label}
        title={`• Profit / Loss: ${formatNumber(leftProfitLoss)} • Conversions: ${formatNumber(left.row.conversions)}`}
      >
        <PositionTable position={left.row.state.position} />
      </StrategySection>
      <StrategySection
        label={right.label}
        title={`• Profit / Loss: ${formatNumber(rightProfitLoss)} • Conversions: ${formatNumber(right.row.conversions)}`}
      >
        <PositionTable position={right.row.state.position} />
      </StrategySection>
      <StrategySection label={left.label} title="Profit / Loss">
        <ProfitLossTable timestamp={left.row.state.timestamp} algorithm={left.algorithm} />
      </StrategySection>
      <StrategySection label={right.label} title="Profit / Loss">
        <ProfitLossTable timestamp={right.row.state.timestamp} algorithm={right.algorithm} />
      </StrategySection>
      <StrategySection label={left.label} title="Most Recent Own trades">
        <TradesTable trades={left.row.state.ownTrades} />
      </StrategySection>
      <StrategySection label={right.label} title="Most Recent Own trades">
        <TradesTable trades={right.row.state.ownTrades} />
      </StrategySection>
      <StrategySection label={left.label} title="Most Recent Market trades">
        <TradesTable trades={left.row.state.marketTrades} />
      </StrategySection>
      <StrategySection label={right.label} title="Most Recent Market trades">
        <TradesTable trades={right.row.state.marketTrades} />
      </StrategySection>
      <StrategySection label={left.label} title="Orders">
        <OrdersTable orders={left.row.orders} />
      </StrategySection>
      <StrategySection label={right.label} title="Orders">
        <OrdersTable orders={right.row.orders} />
      </StrategySection>
      <StrategySection label={left.label} title="Previous trader data">
        {left.row.state.traderData ? (
          <ScrollableCodeHighlight code={formatTraderData(left.row.state.traderData)} language="json" />
        ) : (
          <Text>Timestamp has no previous trader data</Text>
        )}
      </StrategySection>
      <StrategySection label={right.label} title="Previous trader data">
        {right.row.state.traderData ? (
          <ScrollableCodeHighlight code={formatTraderData(right.row.state.traderData)} language="json" />
        ) : (
          <Text>Timestamp has no previous trader data</Text>
        )}
      </StrategySection>
      <StrategySection label={left.label} title="Next trader data">
        {left.row.traderData ? (
          <ScrollableCodeHighlight code={formatTraderData(left.row.traderData)} language="json" />
        ) : (
          <Text>Timestamp has no next trader data</Text>
        )}
      </StrategySection>
      <StrategySection label={right.label} title="Next trader data">
        {right.row.traderData ? (
          <ScrollableCodeHighlight code={formatTraderData(right.row.traderData)} language="json" />
        ) : (
          <Text>Timestamp has no next trader data</Text>
        )}
      </StrategySection>
      <StrategySection label={left.label} title="Sandbox logs">
        {left.row.sandboxLogs ? (
          <ScrollableCodeHighlight code={left.row.sandboxLogs} language="markdown" />
        ) : (
          <Text>Timestamp has no sandbox logs</Text>
        )}
      </StrategySection>
      <StrategySection label={right.label} title="Sandbox logs">
        {right.row.sandboxLogs ? (
          <ScrollableCodeHighlight code={right.row.sandboxLogs} language="markdown" />
        ) : (
          <Text>Timestamp has no sandbox logs</Text>
        )}
      </StrategySection>
      <StrategySection label={left.label} title="Algorithm logs">
        {left.row.algorithmLogs ? (
          <ScrollableCodeHighlight code={left.row.algorithmLogs} language="markdown" />
        ) : (
          <Text>Timestamp has no algorithm logs</Text>
        )}
      </StrategySection>
      <StrategySection label={right.label} title="Algorithm logs">
        {right.row.algorithmLogs ? (
          <ScrollableCodeHighlight code={right.row.algorithmLogs} language="markdown" />
        ) : (
          <Text>Timestamp has no algorithm logs</Text>
        )}
      </StrategySection>
    </Grid>
  );
}
