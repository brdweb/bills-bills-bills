import { useState, useEffect } from 'react';
import { Paper, Text, Loader, Center } from '@mantine/core';
import { AreaChart } from '@mantine/charts';
import { getBillMonthlyPayments } from '../api/client';
import type { MonthlyBillPayment } from '../api/client';

interface PaymentHistoryChartProps {
  billName: string | null;
}

interface ChartData {
  month: string;
  label: string;
  total: number;
}

export function PaymentHistoryChart({ billName }: PaymentHistoryChartProps) {
  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (billName) {
      fetchData();
    }
  }, [billName]);

  const fetchData = async () => {
    if (!billName) return;

    setLoading(true);
    try {
      const response = await getBillMonthlyPayments(billName);
      const monthlyData: MonthlyBillPayment[] = response;

      // Transform and reverse to show chronological order (oldest first)
      const chartData: ChartData[] = monthlyData
        .map((item) => {
          const [year, month] = item.month.split('-');
          const date = new Date(parseInt(year), parseInt(month) - 1, 1);
          return {
            month: item.month,
            label: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
            total: item.total,
          };
        })
        .reverse();

      setData(chartData);
    } catch (error) {
      console.error('Failed to fetch bill monthly payments:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Center py="md">
        <Loader size="sm" />
      </Center>
    );
  }

  if (data.length < 2) {
    return null; // Don't show chart if not enough data
  }

  return (
    <Paper p="sm" withBorder mb="md">
      <Text size="sm" fw={500} mb="xs" c="dimmed">
        Payment History (Last {data.length} Months)
      </Text>
      <AreaChart
        h={150}
        data={data}
        dataKey="label"
        series={[{ name: 'total', color: 'teal.6', label: 'Amount' }]}
        curveType="monotone"
        withTooltip
        tooltipProps={{
          content: ({ payload }) => {
            if (!payload || payload.length === 0) return null;
            const item = payload[0].payload as ChartData;
            return (
              <Paper px="md" py="sm" withBorder shadow="md" radius="md">
                <Text fw={500}>{item.label}</Text>
                <Text c="dimmed" size="sm">
                  ${item.total.toFixed(2)}
                </Text>
              </Paper>
            );
          },
        }}
        yAxisProps={{
          tickFormatter: (value: number) => `$${value}`,
        }}
      />
    </Paper>
  );
}
