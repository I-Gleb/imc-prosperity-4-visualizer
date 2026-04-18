import { Center, Container, Grid, Text, Title } from '@mantine/core';
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
import { assertAlgorithmsComparable, ComparisonDataError, getFinalProfitLoss, getSortedSymbols } from './utils.ts';
import { VisualizerCard } from './VisualizerCard.tsx';

export function ComparisonPage(): ReactNode {
  const visualizer = useStore(state => state.visualizer);
  const { search } = useLocation();

  if (visualizer?.mode !== 'comparison') {
    return <Navigate to={`/${search}`} />;
  }

  const { left, right } = visualizer;
  const labels = visualizer.labels ?? { left: 'Strategy A', right: 'Strategy B' };
  const aliases = { left: 'Strategy A', right: 'Strategy B' };
  const leftProfitLoss = getFinalProfitLoss(left);
  const rightProfitLoss = getFinalProfitLoss(right);
  const profitLossDelta = leftProfitLoss - rightProfitLoss;

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
      <Grid.Col key={`${symbol} - ${aliases.left}`} span={{ xs: 12, sm: 6 }}>
        <OrdersChart symbol={symbol} algorithm={left} title={`${symbol} - ${aliases.left}`} />
      </Grid.Col>,
    );

    symbolColumns.push(
      <Grid.Col key={`${symbol} - ${aliases.right}`} span={{ xs: 12, sm: 6 }}>
        <OrdersChart symbol={symbol} algorithm={right} title={`${symbol} - ${aliases.right}`} />
      </Grid.Col>,
    );
  });

  return (
    <Container fluid>
      <Grid>
        <Grid.Col span={12}>
          <VisualizerCard title="Compared Strategies">
            <Grid>
              <Grid.Col span={{ xs: 12, sm: 6 }}>
                <Title order={4}>{aliases.left}</Title>
                <Text c="dimmed" lineClamp={1}>
                  {labels.left}
                </Text>
              </Grid.Col>
              <Grid.Col span={{ xs: 12, sm: 6 }}>
                <Title order={4}>{aliases.right}</Title>
                <Text c="dimmed" lineClamp={1}>
                  {labels.right}
                </Text>
              </Grid.Col>
            </Grid>
          </VisualizerCard>
        </Grid.Col>
        <Grid.Col span={12}>
          <VisualizerCard title="Final Profit / Loss">
            <Grid align="center">
              <Grid.Col span={{ xs: 12, sm: 5 }}>
                <Center>
                  <div>
                    <Title order={3}>{aliases.left}</Title>
                    <Text size="xl" fw={700}>
                      {formatNumber(leftProfitLoss)}
                    </Text>
                  </div>
                </Center>
              </Grid.Col>
              <Grid.Col span={{ xs: 12, sm: 2 }}>
                <Center>
                  <div>
                    <Text c="dimmed" ta="center">
                      Difference
                    </Text>
                    <Title order={3} ta="center">
                      {formatNumber(profitLossDelta)}
                    </Title>
                  </div>
                </Center>
              </Grid.Col>
              <Grid.Col span={{ xs: 12, sm: 5 }}>
                <Center>
                  <div>
                    <Title order={3}>{aliases.right}</Title>
                    <Text size="xl" fw={700}>
                      {formatNumber(rightProfitLoss)}
                    </Text>
                  </div>
                </Center>
              </Grid.Col>
            </Grid>
          </VisualizerCard>
        </Grid.Col>
        <Grid.Col span={{ xs: 12, sm: 6 }}>
          <ProfitLossChart
            symbols={symbols}
            algorithms={[
              { label: aliases.left, algorithm: left },
              { label: aliases.right, algorithm: right },
            ]}
          />
        </Grid.Col>
        <Grid.Col span={{ xs: 12, sm: 6 }}>
          <PositionChart
            symbols={symbols}
            algorithms={[
              { label: aliases.left, algorithm: left },
              { label: aliases.right, algorithm: right },
            ]}
          />
        </Grid.Col>
        {symbolColumns}
        <Grid.Col span={12}>
          <TimestampsCard
            strategies={[
              { label: aliases.left, algorithm: left },
              { label: aliases.right, algorithm: right },
            ]}
          />
        </Grid.Col>
      </Grid>
    </Container>
  );
}
