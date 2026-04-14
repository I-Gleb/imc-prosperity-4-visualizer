import { Algorithm, AlgorithmDataRow } from '../../models.ts';

export class ComparisonDataError extends Error {
  public constructor(
    message: string,
    public readonly details: string[] = [],
  ) {
    super(message);
  }
}

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

function compareValues(
  leftValue: unknown,
  rightValue: unknown,
  message: string,
  details: string[],
): void {
  if (stringify(leftValue) !== stringify(rightValue)) {
    throw new ComparisonDataError(message, details);
  }
}

export function assertAlgorithmsComparable(left: Algorithm, right: Algorithm): void {
  if (left.activityLogs.length !== right.activityLogs.length || left.data.length !== right.data.length) {
    throw new ComparisonDataError('The selected logs do not cover the same market data.', [
      `Activity log rows: ${left.activityLogs.length} vs ${right.activityLogs.length}`,
      `State snapshots: ${left.data.length} vs ${right.data.length}`,
    ]);
  }

  for (let i = 0; i < left.activityLogs.length; i++) {
    const leftRow = left.activityLogs[i];
    const rightRow = right.activityLogs[i];

    if (leftRow.timestamp !== rightRow.timestamp || leftRow.product !== rightRow.product) {
      throw new ComparisonDataError('The selected logs do not align on the same market timeline.', [
        `Activity row ${i + 1} differs.`,
        `Left: timestamp ${leftRow.timestamp}, product ${leftRow.product}`,
        `Right: timestamp ${rightRow.timestamp}, product ${rightRow.product}`,
      ]);
    }

    compareValues(leftRow.midPrice, rightRow.midPrice, 'The selected logs have different mid-price history.', [
      `Timestamp ${leftRow.timestamp}, product ${leftRow.product}`,
      `Left mid price: ${leftRow.midPrice}`,
      `Right mid price: ${rightRow.midPrice}`,
    ]);
    compareValues(leftRow.bidPrices, rightRow.bidPrices, 'The selected logs have different bid-price history.', [
      `Timestamp ${leftRow.timestamp}, product ${leftRow.product}`,
    ]);
    compareValues(leftRow.bidVolumes, rightRow.bidVolumes, 'The selected logs have different bid-volume history.', [
      `Timestamp ${leftRow.timestamp}, product ${leftRow.product}`,
    ]);
    compareValues(leftRow.askPrices, rightRow.askPrices, 'The selected logs have different ask-price history.', [
      `Timestamp ${leftRow.timestamp}, product ${leftRow.product}`,
    ]);
    compareValues(leftRow.askVolumes, rightRow.askVolumes, 'The selected logs have different ask-volume history.', [
      `Timestamp ${leftRow.timestamp}, product ${leftRow.product}`,
    ]);
  }

  for (let i = 0; i < left.data.length; i++) {
    const leftRow = left.data[i];
    const rightRow = right.data[i];

    if (leftRow.state.timestamp !== rightRow.state.timestamp) {
      throw new ComparisonDataError('The selected logs do not use the same state timestamps.', [
        `State row ${i + 1}: ${leftRow.state.timestamp} vs ${rightRow.state.timestamp}`,
      ]);
    }

    compareValues(leftRow.state.listings, rightRow.state.listings, 'The selected logs have different listings.', [
      `Timestamp ${leftRow.state.timestamp}`,
    ]);
    compareValues(
      leftRow.state.orderDepths,
      rightRow.state.orderDepths,
      'The selected logs have different order-depth snapshots.',
      [`Timestamp ${leftRow.state.timestamp}`],
    );
    compareValues(
      leftRow.state.observations,
      rightRow.state.observations,
      'The selected logs have different observation snapshots.',
      [`Timestamp ${leftRow.state.timestamp}`],
    );
  }
}
