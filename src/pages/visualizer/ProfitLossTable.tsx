import { Table } from '@mantine/core';
import { ReactNode } from 'react';
import { useSingleAlgorithm } from '../../hooks/use-single-algorithm.ts';
import { Algorithm } from '../../models.ts';
import { getAskColor, getBidColor } from '../../utils/colors.ts';
import { formatNumber } from '../../utils/format.ts';
import { SimpleTable } from './SimpleTable.tsx';

export interface ProfitLossTableProps {
  timestamp: number;
  algorithm?: Algorithm;
}

export function ProfitLossTable({ timestamp, algorithm: providedAlgorithm }: ProfitLossTableProps): ReactNode {
  const algorithm = providedAlgorithm ?? useSingleAlgorithm()!;

  const rows: ReactNode[] = algorithm.activityLogs
    .filter(row => row.timestamp === timestamp)
    .sort((a, b) => a.product.localeCompare(b.product))
    .map(row => {
      let colorFunc: (alpha: number) => string = () => 'transparent';
      if (row.profitLoss > 0) {
        colorFunc = getBidColor;
      } else if (row.profitLoss < 0) {
        colorFunc = getAskColor;
      }

      return (
        <Table.Tr key={row.product} style={{ backgroundColor: colorFunc(0.1) }}>
          <Table.Td>{row.product}</Table.Td>
          <Table.Td>{formatNumber(row.profitLoss)}</Table.Td>
        </Table.Tr>
      );
    });

  return <SimpleTable label="profit / loss" columns={['Product', 'Profit / Loss']} rows={rows} />;
}
