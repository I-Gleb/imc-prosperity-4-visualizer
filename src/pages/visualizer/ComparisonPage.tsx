import { Center, Container, Grid, Title } from '@mantine/core';
import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ErrorAlert } from '../../components/ErrorAlert.tsx';
import { useStore } from '../../store.ts';
import { formatNumber } from '../../utils/format.ts';
import { CandlestickChart } from './CandlestickChart.tsx';
import { OrdersChart } from './OrdersChart.tsx';
import { PositionChart } from './PositionChart.tsx';
import { ProfitLossChart } from './ProfitLossChart.tsx';
import { TimestampsCard } from './TimestampsCard.tsx';
import { VisualizerCard } from './VisualizerCard.tsx';
import { assertAlgorithmsComparable, ComparisonDataError, getFinalProfitLoss, getSortedSymbols } from './utils.ts';

export function ComparisonPage(): ReactNode {
  const visualizer = useStore(state => state.visualizer);
  const { search } = useLocation();

  if (visualizer?.mode !== 'comparison') {
    return <Navigate to={`/${search}`} />;
  }

  const { left, right } = visualizer;
  const labels = visualizer.labels ?? { left: 'Strategy A', right: 'Strategy B' };

  try {
    assertAlgorithmsComparable(left, right);
  } catch (error) {
    const normalized = error instanceof Error ? error : new ComparisonDataError('The selected logs cannot be compared.');

    return (
      <Container fluid>
        <ErrorAlert error={normalized} />
      </Container>
    );
  }

  const symbols = getSortedSymbols(left);
  const symbolColumns: ReactNode[] = [];

  symbols.forEach(symbol => {
    symbolColumns.push(
      <Grid.Col key={`${symbol} - movement`} span={12}>
        <CandlestickChart symbol={symbol} algorithm={left} />
      </Grid.Col>,
    );

    symbolColumns.push(
      <Grid.Col key={`${symbol} - ${labels.left}`} span={{ xs: 12, sm: 6 }}>
        <OrdersChart symbol={symbol} algorithm={left} title={`${labels.left} - ${symbol} Order Book`} />
      </Grid.Col>,
    );

    symbolColumns.push(
      <Grid.Col key={`${symbol} - ${labels.right}`} span={{ xs: 12, sm: 6 }}>
        <OrdersChart symbol={symbol} algorithm={right} title={`${labels.right} - ${symbol} Order Book`} />
      </Grid.Col>,
    );
  });

  return (
    <Container fluid>
      <Grid>
        <Grid.Col span={12}>
          <VisualizerCard>
            <Center>
              <Title order={2}>
                Final Profit / Loss: {labels.left} {formatNumber(getFinalProfitLoss(left))} • {labels.right}{' '}
                {formatNumber(getFinalProfitLoss(right))}
              </Title>
            </Center>
          </VisualizerCard>
        </Grid.Col>
        <Grid.Col span={{ xs: 12, sm: 6 }}>
          <ProfitLossChart
            symbols={symbols}
            algorithms={[
              { label: labels.left, algorithm: left },
              { label: labels.right, algorithm: right },
            ]}
          />
        </Grid.Col>
        <Grid.Col span={{ xs: 12, sm: 6 }}>
          <PositionChart
            symbols={symbols}
            algorithms={[
              { label: labels.left, algorithm: left },
              { label: labels.right, algorithm: right },
            ]}
          />
        </Grid.Col>
        {symbolColumns}
        <Grid.Col span={12}>
          <TimestampsCard
            strategies={[
              { label: labels.left, algorithm: left },
              { label: labels.right, algorithm: right },
            ]}
          />
        </Grid.Col>
      </Grid>
    </Container>
  );
}
