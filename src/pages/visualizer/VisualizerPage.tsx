import { Center, Container, Grid, Title } from '@mantine/core';
import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useStore } from '../../store.ts';
import { formatNumber } from '../../utils/format.ts';
import { AlgorithmSummaryCard } from './AlgorithmSummaryCard.tsx';
import { CandlestickChart } from './CandlestickChart.tsx';
import { ConversionPriceChart } from './ConversionPriceChart.tsx';
import { EnvironmentChart } from './EnvironmentChart.tsx';
import { OrdersChart } from './OrdersChart.tsx';
import { PlainValueObservationChart } from './PlainValueObservationChart.tsx';
import { PositionChart } from './PositionChart.tsx';
import { ProfitLossChart } from './ProfitLossChart.tsx';
import { TimestampsCard } from './TimestampsCard.tsx';
import { TransportChart } from './TransportChart.tsx';
import { VisualizerCard } from './VisualizerCard.tsx';
import {
  getConversionProducts,
  getFinalProfitLoss,
  getSortedPlainValueObservationSymbols,
  getSortedSymbols,
} from './utils.ts';

export function VisualizerPage(): ReactNode {
  const visualizer = useStore(state => state.visualizer);

  const { search } = useLocation();

  if (visualizer?.mode !== 'single') {
    return <Navigate to={`/${search}`} />;
  }
  const algorithm = visualizer.algorithm;
  const conversionProducts = getConversionProducts(algorithm);
  const profitLoss = getFinalProfitLoss(algorithm);
  const sortedSymbols = getSortedSymbols(algorithm);
  const sortedPlainValueObservationSymbols = getSortedPlainValueObservationSymbols(algorithm);

  const symbolColumns: ReactNode[] = [];
  sortedSymbols.forEach(symbol => {
    symbolColumns.push(
      <Grid.Col key={`${symbol} - candlestick`} span={{ xs: 12, sm: 6 }}>
        <CandlestickChart symbol={symbol} />
      </Grid.Col>,
    );

    symbolColumns.push(
      <Grid.Col key={`${symbol} - orders`} span={{ xs: 12, sm: 6 }}>
        <OrdersChart symbol={symbol} />
      </Grid.Col>,
    );

    if (!conversionProducts.has(symbol)) {
      return;
    }

    symbolColumns.push(
      <Grid.Col key={`${symbol} - conversion price`} span={{ xs: 12, sm: 6 }}>
        <ConversionPriceChart symbol={symbol} />
      </Grid.Col>,
    );

    symbolColumns.push(
      <Grid.Col key={`${symbol} - transport`} span={{ xs: 12, sm: 6 }}>
        <TransportChart symbol={symbol} />
      </Grid.Col>,
    );

    symbolColumns.push(
      <Grid.Col key={`${symbol} - environment`} span={{ xs: 12, sm: 6 }}>
        <EnvironmentChart symbol={symbol} />
      </Grid.Col>,
    );

    symbolColumns.push(<Grid.Col key={`${symbol} - environment`} span={{ xs: 12, sm: 6 }} />);
  });

  sortedPlainValueObservationSymbols.forEach(symbol => {
    symbolColumns.push(
      <Grid.Col key={`${symbol} - plain value observation`} span={{ xs: 12, sm: 6 }}>
        <PlainValueObservationChart symbol={symbol} />
      </Grid.Col>,
    );
  });

  return (
    <Container fluid>
      <Grid>
        <Grid.Col span={12}>
          <VisualizerCard>
            <Center>
              <Title order={2}>Final Profit / Loss: {formatNumber(profitLoss)}</Title>
            </Center>
          </VisualizerCard>
        </Grid.Col>
        <Grid.Col span={{ xs: 12, sm: 6 }}>
          <ProfitLossChart symbols={sortedSymbols} />
        </Grid.Col>
        <Grid.Col span={{ xs: 12, sm: 6 }}>
          <PositionChart symbols={sortedSymbols} />
        </Grid.Col>
        {symbolColumns}
        <Grid.Col span={12}>
          <TimestampsCard />
        </Grid.Col>
        {algorithm.summary && (
          <Grid.Col span={12}>
            <AlgorithmSummaryCard />
          </Grid.Col>
        )}
      </Grid>
    </Container>
  );
}
