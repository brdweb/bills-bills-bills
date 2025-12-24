import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api/client';
import { useTheme } from '../context/ThemeContext';
import { Payment, Bill } from '../types';

type Props = NativeStackScreenProps<any, 'PaymentHistory'>;

interface PaymentWithBill extends Payment {
  bill_name?: string;
  bill_type?: 'expense' | 'deposit';
}

export default function PaymentHistoryScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const [payments, setPayments] = useState<PaymentWithBill[]>([]);
  const [bills, setBills] = useState<Map<number, Bill>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'expense' | 'deposit'>('all');

  const fetchData = useCallback(async () => {
    try {
      const [paymentsRes, billsRes] = await Promise.all([
        api.getAllPayments(),
        api.getBills(true), // Include archived to get bill names
      ]);

      if (paymentsRes.success && paymentsRes.data) {
        // Create a map of bills for quick lookup
        const billMap = new Map<number, Bill>();
        if (billsRes.success && billsRes.data) {
          billsRes.data.forEach(bill => billMap.set(bill.id, bill));
        }
        setBills(billMap);

        // Enrich payments with bill info
        const enrichedPayments = paymentsRes.data.map(payment => ({
          ...payment,
          bill_name: billMap.get(payment.bill_id)?.name || 'Unknown Bill',
          bill_type: billMap.get(payment.bill_id)?.type,
        }));

        // Sort by date descending (most recent first)
        enrichedPayments.sort((a, b) =>
          new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
        );

        setPayments(enrichedPayments);
        setError(null);
      } else {
        setError(paymentsRes.error || 'Failed to load payments');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchData();
  }, [fetchData]);

  const handleDeletePayment = (payment: PaymentWithBill) => {
    Alert.alert(
      'Delete Payment',
      `Delete this ${formatCurrency(payment.amount)} payment for "${payment.bill_name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await api.deletePayment(payment.id);
            if (result.success) {
              fetchData();
            } else {
              Alert.alert('Error', result.error || 'Failed to delete payment');
            }
          },
        },
      ]
    );
  };

  const formatCurrency = (amount: number): string => {
    return `$${amount.toFixed(2)}`;
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const groupPaymentsByMonth = (payments: PaymentWithBill[]) => {
    const groups: { [key: string]: PaymentWithBill[] } = {};

    payments.forEach(payment => {
      const date = new Date(payment.payment_date + 'T00:00:00');
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      if (!groups[monthKey]) {
        groups[monthKey] = [];
      }
      groups[monthKey].push({ ...payment, monthLabel } as any);
    });

    return Object.entries(groups).map(([key, items]) => ({
      key,
      label: items[0] ? (items[0] as any).monthLabel : key,
      data: items,
      total: items.reduce((sum, p) => sum + p.amount, 0),
    }));
  };

  const filteredPayments = payments.filter(p => {
    if (filter === 'all') return true;
    return p.bill_type === filter;
  });

  const groupedPayments = groupPaymentsByMonth(filteredPayments);

  const renderPayment = ({ item }: { item: PaymentWithBill }) => {
    const isDeposit = item.bill_type === 'deposit';

    return (
      <TouchableOpacity
        style={[styles.paymentCard, { backgroundColor: colors.surface }]}
        onLongPress={() => handleDeletePayment(item)}
        delayLongPress={500}
      >
        <View style={styles.paymentInfo}>
          <Text style={[styles.billName, { color: colors.text }]}>{item.bill_name}</Text>
          <Text style={[styles.paymentDate, { color: colors.textMuted }]}>
            {formatDate(item.payment_date)}
          </Text>
          {item.notes && (
            <Text style={[styles.paymentNotes, { color: colors.textMuted }]} numberOfLines={1}>
              {item.notes}
            </Text>
          )}
        </View>
        <Text style={[
          styles.paymentAmount,
          { color: isDeposit ? colors.success : colors.danger }
        ]}>
          {isDeposit ? '+' : '-'}{formatCurrency(item.amount)}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderMonthSection = ({ item }: { item: { key: string; label: string; data: PaymentWithBill[]; total: number } }) => (
    <View style={styles.monthSection}>
      <View style={styles.monthHeader}>
        <Text style={[styles.monthLabel, { color: colors.text }]}>{item.label}</Text>
        <Text style={[styles.monthTotal, { color: colors.textMuted }]}>
          {item.data.length} payment{item.data.length !== 1 ? 's' : ''} • {formatCurrency(item.total)}
        </Text>
      </View>
      {item.data.map(payment => (
        <View key={payment.id}>
          {renderPayment({ item: payment })}
        </View>
      ))}
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={[styles.backButtonText, { color: colors.primary }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Payment History</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Filter Tabs */}
      <View style={[styles.filterContainer, { backgroundColor: colors.surface }]}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            { backgroundColor: colors.background },
            filter === 'all' && { backgroundColor: colors.primary },
          ]}
          onPress={() => setFilter('all')}
        >
          <Text style={[
            styles.filterButtonText,
            { color: colors.text },
            filter === 'all' && { color: '#fff' },
          ]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            { backgroundColor: colors.background },
            filter === 'expense' && { backgroundColor: colors.danger },
          ]}
          onPress={() => setFilter('expense')}
        >
          <Text style={[
            styles.filterButtonText,
            { color: colors.text },
            filter === 'expense' && { color: '#fff' },
          ]}>
            Expenses
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            { backgroundColor: colors.background },
            filter === 'deposit' && { backgroundColor: colors.success },
          ]}
          onPress={() => setFilter('deposit')}
        >
          <Text style={[
            styles.filterButtonText,
            { color: colors.text },
            filter === 'deposit' && { color: '#fff' },
          ]}>
            Income
          </Text>
        </TouchableOpacity>
      </View>

      {error ? (
        <View style={styles.centered}>
          <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={fetchData}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={groupedPayments}
          keyExtractor={(item) => item.key}
          renderItem={renderMonthSection}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No payments recorded</Text>
              <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
                Record a payment on a bill to see it here
              </Text>
            </View>
          }
          ListHeaderComponent={
            filteredPayments.length > 0 ? (
              <Text style={[styles.totalHeader, { color: colors.textMuted }]}>
                {filteredPayments.length} payment{filteredPayments.length !== 1 ? 's' : ''} •
                Total: {formatCurrency(filteredPayments.reduce((sum, p) => sum + p.amount, 0))}
              </Text>
            ) : null
          }
          ListFooterComponent={
            <Text style={[styles.hint, { color: colors.textMuted }]}>
              Long-press a payment to delete it
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    padding: 4,
  },
  backButtonText: {
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 60,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  list: {
    padding: 16,
    paddingBottom: 40,
  },
  totalHeader: {
    fontSize: 14,
    marginBottom: 16,
  },
  monthSection: {
    marginBottom: 24,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  monthLabel: {
    fontSize: 18,
    fontWeight: '600',
  },
  monthTotal: {
    fontSize: 13,
  },
  paymentCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  paymentInfo: {
    flex: 1,
    marginRight: 12,
  },
  billName: {
    fontSize: 15,
    fontWeight: '600',
  },
  paymentDate: {
    fontSize: 12,
    marginTop: 2,
  },
  paymentNotes: {
    fontSize: 12,
    marginTop: 2,
    fontStyle: 'italic',
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 16,
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyText: {
    fontSize: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
  },
  hint: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
  },
});
