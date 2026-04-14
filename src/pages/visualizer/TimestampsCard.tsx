import { Group, NumberInput, Slider, SliderProps, Text, Title } from '@mantine/core';
import { useHotkeys } from '@mantine/hooks';
import { KeyboardEvent, ReactNode, useEffect, useState } from 'react';
import { useSingleAlgorithm } from '../../hooks/use-single-algorithm.ts';
import { Algorithm } from '../../models.ts';
import { formatNumber } from '../../utils/format.ts';
import { TimestampDetail } from './TimestampDetail.tsx';
import { getRowsByTimestamp } from './utils.ts';
import { VisualizerCard } from './VisualizerCard.tsx';

export interface TimestampsCardProps {
  strategies?: { label: string; algorithm: Algorithm }[];
}

export function TimestampsCard({ strategies }: TimestampsCardProps): ReactNode {
  const singleAlgorithm = useSingleAlgorithm();
  const strategyEntries = strategies ?? [{ label: 'Strategy', algorithm: singleAlgorithm! }];
  const rowsByTimestamp = strategyEntries.map(strategy => getRowsByTimestamp(strategy.algorithm));
  const primaryAlgorithm = strategyEntries[0].algorithm;

  const timestampMin = primaryAlgorithm.data[0].state.timestamp;
  const timestampMax = primaryAlgorithm.data[primaryAlgorithm.data.length - 1].state.timestamp;
  const timestampStep = primaryAlgorithm.data[1].state.timestamp - primaryAlgorithm.data[0].state.timestamp;

  const [timestamp, setTimestamp] = useState(timestampMin);
  const [inputValue, setInputValue] = useState<number | string>(timestampMin);

  useEffect(() => {
    setInputValue(timestamp);
  }, [timestamp]);

  const marks: SliderProps['marks'] = [];
  for (let i = timestampMin; i < timestampMax; i += (timestampMax + 100) / 4) {
    marks.push({
      value: i,
      label: formatNumber(i),
    });
  }

  function snapToNearest(value: number): number {
    const clamped = Math.max(timestampMin, Math.min(timestampMax, value));
    return Math.round((clamped - timestampMin) / timestampStep) * timestampStep + timestampMin;
  }

  function commit(): void {
    const parsed = typeof inputValue === 'number' ? inputValue : Number(inputValue);
    if (!isNaN(parsed)) {
      setTimestamp(snapToNearest(parsed));
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>): void {
    if (e.key === 'Enter') commit();
  }

  useHotkeys([
    ['ArrowLeft', () => setTimestamp(timestamp === timestampMin ? timestamp : timestamp - timestampStep)],
    ['ArrowRight', () => setTimestamp(timestamp === timestampMax ? timestamp : timestamp + timestampStep)],
  ]);

  return (
    <VisualizerCard>
      <Group align="center" gap="xs" mb="xs">
        <Title order={4}>Timestamps</Title>
        <NumberInput
          value={inputValue}
          onChange={value => {
            setInputValue(value);
            if (typeof value === 'number' && snapToNearest(value) === value) {
              setTimestamp(value);
            }
          }}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          min={timestampMin}
          max={timestampMax}
          step={timestampStep}
          style={{ width: 150 }}
          styles={{ input: { fontWeight: 700, fontSize: 'var(--mantine-font-size-sm)' } }}
        />
      </Group>

      <Slider
        min={timestampMin}
        max={timestampMax}
        step={timestampStep}
        marks={marks}
        label={value => `Timestamp ${formatNumber(value)}`}
        value={timestamp}
        onChange={setTimestamp}
        mb="lg"
      />

      {strategyEntries.length === 1 ? (
        rowsByTimestamp[0][timestamp] ? (
          <TimestampDetail mode="single" algorithm={strategyEntries[0].algorithm} row={rowsByTimestamp[0][timestamp]} />
        ) : (
          <Text>No logs found for timestamp {formatNumber(timestamp)}</Text>
        )
      ) : rowsByTimestamp.every(rows => rows[timestamp]) ? (
        <TimestampDetail
          mode="comparison"
          timestamp={timestamp}
          sharedRow={rowsByTimestamp[0][timestamp]}
          strategies={strategyEntries.map((strategy, index) => ({
            label: strategy.label,
            algorithm: strategy.algorithm,
            row: rowsByTimestamp[index][timestamp],
          }))}
        />
      ) : (
        <Text>No logs found for timestamp {formatNumber(timestamp)}</Text>
      )}
    </VisualizerCard>
  );
}
