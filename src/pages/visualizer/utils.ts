import { Algorithm, AlgorithmDataRow } from '../../models.ts';

export class ComparisonDataError extends Error {}

export function getConversionProducts(algorithm: Algorithm): Set<string> {
  const conversionProducts = new Set<string>();

  for (const row of algorithm.data) {
    for (const product of Object.keys(row.state.observations.conversionObservations)) {
      conversionProducts.add(product);
    }
  }

  return conversionProducts;
}

export function getSortedSymbols(algorithm: Algorithm): string[] {
  const symbols = new Set<string>();

  for (let i = 0; i < algorithm.data.length; i += 1000) {
    const row = algorithm.data[i];

    for (const key of Object.keys(row.state.listings)) {
      symbols.add(key);
    }
  }

  return [...symbols].sort((a, b) => a.localeCompare(b));
}

export function getSortedPlainValueObservationSymbols(algorithm: Algorithm): string[] {
  const plainValueObservationSymbols = new Set<string>();

  for (let i = 0; i < algorithm.data.length; i += 1000) {
    const row = algorithm.data[i];

    for (const key of Object.keys(row.state.observations.plainValueObservations)) {
      plainValueObservationSymbols.add(key);
    }
  }

  return [...plainValueObservationSymbols].sort((a, b) => a.localeCompare(b));
}

export function getFinalProfitLoss(algorithm: Algorithm): number {
  let profitLoss = 0;
  const lastTimestamp = algorithm.activityLogs[algorithm.activityLogs.length - 1].timestamp;

  for (let i = algorithm.activityLogs.length - 1; i >= 0 && algorithm.activityLogs[i].timestamp == lastTimestamp; i--) {
    profitLoss += algorithm.activityLogs[i].profitLoss;
  }

  return profitLoss;
}

export function getRowsByTimestamp(algorithm: Algorithm): Record<number, AlgorithmDataRow> {
  const rowsByTimestamp: Record<number, AlgorithmDataRow> = {};

  for (const row of algorithm.data) {
    rowsByTimestamp[row.state.timestamp] = row;
  }

  return rowsByTimestamp;
}

function stringify(value: unknown): string {
  return JSON.stringify(value);
}

export function assertAlgorithmsComparable(left: Algorithm, right: Algorithm): void {
  if (left.activityLogs.length !== right.activityLogs.length || left.data.length !== right.data.length) {
    throw new ComparisonDataError('The selected logs do not cover the same market data.');
  }

  for (let i = 0; i < left.activityLogs.length; i++) {
    const leftRow = left.activityLogs[i];
    const rightRow = right.activityLogs[i];

    if (
      leftRow.timestamp !== rightRow.timestamp ||
      leftRow.product !== rightRow.product ||
      leftRow.midPrice !== rightRow.midPrice ||
      stringify(leftRow.bidPrices) !== stringify(rightRow.bidPrices) ||
      stringify(leftRow.bidVolumes) !== stringify(rightRow.bidVolumes) ||
      stringify(leftRow.askPrices) !== stringify(rightRow.askPrices) ||
      stringify(leftRow.askVolumes) !== stringify(rightRow.askVolumes)
    ) {
      throw new ComparisonDataError('The selected logs do not share the same price movement history.');
    }
  }

  for (let i = 0; i < left.data.length; i++) {
    const leftRow = left.data[i];
    const rightRow = right.data[i];

    if (leftRow.state.timestamp !== rightRow.state.timestamp) {
      throw new ComparisonDataError('The selected logs do not use the same timestamps.');
    }

    if (
      stringify(leftRow.state.listings) !== stringify(rightRow.state.listings) ||
      stringify(leftRow.state.orderDepths) !== stringify(rightRow.state.orderDepths) ||
      stringify(leftRow.state.observations) !== stringify(rightRow.state.observations)
    ) {
      throw new ComparisonDataError('The selected logs do not share the same market-state snapshots.');
    }
  }
}
