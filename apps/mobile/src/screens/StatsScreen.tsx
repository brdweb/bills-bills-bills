import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  FlatList,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api } from '../api/client';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { MonthlyStats, Bill } from '../types';

type SettingsStackParamList = {
  Settings: undefined;
  PaymentHistory: undefined;
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 32; // Full width minus padding
const CARD_MARGIN = 8;

export default function StatsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();
  const { colors } = useTheme();
  const { user, currentDatabase, databases } = useAuth();
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const carouselRef = useRef<FlatList>(null);

  const fetchData = useCallback(async () => {
    if (!currentDatabase) {
      setIsLoading(false);
      setError('No database selected');
      return;
    }

    try {
      // Fetch stats and bills separately to handle errors better
      let statsData: MonthlyStats[] = [];
      let billsData: Bill[] = [];

      try {
        const statsRes = await api.getMonthlyStats();
        console.log('[StatsScreen] getMonthlyStats response:', JSON.stringify(statsRes, null, 2));
        if (statsRes.success && statsRes.data) {
          // Handle both array format and object format
          let data = statsRes.data;
          if (!Array.isArray(data)) {
            // Convert object format { "2025-12": {...}, ... } to array format
            data = Object.entries(data).map(([month, values]: [string, any]) => ({
              month,
              total_expenses: values.expenses || 0,
              total_deposits: values.deposits || 0,
              net: (values.deposits || 0) - (values.expenses || 0),
            }));
          }
          // Sort by month descending (most recent first)
          statsData = [...data].sort((a, b) => b.month.localeCompare(a.month));
          console.log('[StatsScreen] Processed stats:', statsData);
        }
      } catch (statsErr) {
        console.log('[StatsScreen] Stats API error:', statsErr);
      }

      try {
        const billsRes = await api.getBills();
        if (billsRes.success && Array.isArray(billsRes.data)) {
          billsData = billsRes.data;
        }
      } catch (billsErr) {
        console.log('Bills API error:', billsErr);
      }

      setMonthlyStats(statsData);
      setBills(billsData);
      setError(null);
    } catch (err) {
      console.log('Stats fetch error:', err);
      setError('Failed to load statistics');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [currentDatabase]);

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

  const formatCurrency = (amount: number): string => {
    return `$${Math.abs(amount).toFixed(2)}`;
  };

  const formatMonth = (monthStr: string): string => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const currentDbInfo = databases.find(db => db.name === currentDatabase);

  // Calculate upcoming bills (due in next 30 days)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thirtyDaysFromNow = new Date(today);
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const upcomingBills = bills.filter(bill => {
    const dueDate = new Date(bill.next_due + 'T00:00:00');
    return dueDate >= today && dueDate <= thirtyDaysFromNow && bill.type === 'expense';
  });

  const upcomingTotal = upcomingBills.reduce((sum, bill) => sum + (bill.amount || 0), 0);

  const upcomingIncome = bills.filter(bill => {
    const dueDate = new Date(bill.next_due + 'T00:00:00');
    return dueDate >= today && dueDate <= thirtyDaysFromNow && bill.type === 'deposit';
  });

  const upcomingIncomeTotal = upcomingIncome.reduce((sum, bill) => sum + (bill.amount || 0), 0);

  // Find max value for chart scaling
  const maxValue = Math.max(
    ...monthlyStats.map(s => Math.max(s.total_expenses, s.total_deposits, Math.abs(s.net))),
    1
  );

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Statistics</Text>
          <Text style={[styles.usernameText, { color: colors.textMuted }]}>
            {user?.username}
          </Text>
        </View>
        <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
          {currentDbInfo?.display_name || 'Financial Overview'}
        </Text>
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={fetchData}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Payment History Quick Access - at the top */}
          <View style={styles.sectionContainer}>
            <TouchableOpacity
              style={[styles.paymentHistoryButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => navigation.navigate('PaymentHistory' as never)}
            >
              <View style={styles.paymentHistoryContent}>
                <Text style={[styles.paymentHistoryTitle, { color: colors.text }]}>
                  Payment History
                </Text>
                <Text style={[styles.paymentHistorySubtitle, { color: colors.textMuted }]}>
                  View all recorded payments
                </Text>
              </View>
              <Text style={[styles.paymentHistoryArrow, { color: colors.textMuted }]}>→</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Summary Cards */}
          <View style={styles.summaryContainer}>
            <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
                Upcoming Expenses (30d)
              </Text>
              <Text style={[styles.summaryValue, { color: colors.danger }]}>
                -{formatCurrency(upcomingTotal)}
              </Text>
              <Text style={[styles.summarySubtext, { color: colors.textMuted }]}>
                {upcomingBills.length} bill{upcomingBills.length !== 1 ? 's' : ''}
              </Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
                Upcoming Income (30d)
              </Text>
              <Text style={[styles.summaryValue, { color: colors.success }]}>
                +{formatCurrency(upcomingIncomeTotal)}
              </Text>
              <Text style={[styles.summarySubtext, { color: colors.textMuted }]}>
                {upcomingIncome.length} deposit{upcomingIncome.length !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>

          {/* Monthly History Carousel */}
          <View style={styles.carouselSection}>
            <View style={styles.carouselHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Monthly History</Text>
              {monthlyStats.length > 0 && (
                <Text style={[styles.carouselIndicator, { color: colors.textMuted }]}>
                  {currentIndex + 1} / {Math.min(monthlyStats.length, 12)}
                </Text>
              )}
            </View>
            {monthlyStats.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.surface, marginHorizontal: 16 }]}>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  No payment history yet
                </Text>
              </View>
            ) : (
              <>
                <FlatList
                  ref={carouselRef}
                  data={monthlyStats.slice(0, 12)}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  snapToInterval={CARD_WIDTH + CARD_MARGIN * 2}
                  decelerationRate="fast"
                  contentContainerStyle={styles.carouselContent}
                  onMomentumScrollEnd={(e) => {
                    const index = Math.round(e.nativeEvent.contentOffset.x / (CARD_WIDTH + CARD_MARGIN * 2));
                    setCurrentIndex(index);
                  }}
                  keyExtractor={(item) => item.month}
                  renderItem={({ item: stat, index }) => (
                    <View style={[styles.carouselCard, { backgroundColor: colors.surface, width: CARD_WIDTH }]}>
                      <Text style={[styles.monthTitle, { color: colors.text }]}>
                        {formatMonth(stat.month)}
                      </Text>

                      {/* Summary Stats */}
                      <View style={styles.carouselStats}>
                        <View style={styles.carouselStatItem}>
                          <Text style={[styles.carouselStatLabel, { color: colors.textMuted }]}>Expenses</Text>
                          <Text style={[styles.carouselStatValue, { color: colors.danger }]}>
                            -{formatCurrency(stat.total_expenses)}
                          </Text>
                        </View>
                        <View style={[styles.carouselStatDivider, { backgroundColor: colors.border }]} />
                        <View style={styles.carouselStatItem}>
                          <Text style={[styles.carouselStatLabel, { color: colors.textMuted }]}>Income</Text>
                          <Text style={[styles.carouselStatValue, { color: colors.success }]}>
                            +{formatCurrency(stat.total_deposits)}
                          </Text>
                        </View>
                      </View>

                      {/* Mini bar chart */}
                      <View style={styles.barContainer}>
                        <View style={styles.barRow}>
                          <Text style={[styles.barLabel, { color: colors.textMuted }]}>Expenses</Text>
                          <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
                            <View
                              style={[
                                styles.bar,
                                {
                                  backgroundColor: colors.danger,
                                  width: `${(stat.total_expenses / maxValue) * 100}%`,
                                },
                              ]}
                            />
                          </View>
                        </View>
                        <View style={styles.barRow}>
                          <Text style={[styles.barLabel, { color: colors.textMuted }]}>Income</Text>
                          <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
                            <View
                              style={[
                                styles.bar,
                                {
                                  backgroundColor: colors.success,
                                  width: `${(stat.total_deposits / maxValue) * 100}%`,
                                },
                              ]}
                            />
                          </View>
                        </View>
                      </View>

                      <View style={[styles.netRow, { borderTopColor: colors.border }]}>
                        <Text style={[styles.netLabel, { color: colors.text }]}>Net</Text>
                        <Text style={[
                          styles.netValue,
                          { color: stat.net >= 0 ? colors.success : colors.danger }
                        ]}>
                          {stat.net >= 0 ? '+' : ''}{formatCurrency(stat.net)}
                        </Text>
                      </View>
                    </View>
                  )}
                />
                {/* Dot Indicators */}
                <View style={styles.dotContainer}>
                  {monthlyStats.slice(0, 12).map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.dot,
                        {
                          backgroundColor: index === currentIndex ? colors.primary : colors.border,
                        },
                      ]}
                    />
                  ))}
                </View>
              </>
            )}
          </View>

          <View style={styles.footer} />
        </>
      )}
    </ScrollView>
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
    padding: 20,
    paddingTop: 60,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  usernameText: {
    fontSize: 14,
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  errorContainer: {
    padding: 32,
    alignItems: 'center',
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
  summaryContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  summarySubtext: {
    fontSize: 12,
    marginTop: 4,
  },
  sectionContainer: {
    padding: 16,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  carouselSection: {
    paddingTop: 8,
  },
  carouselHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  carouselIndicator: {
    fontSize: 14,
  },
  carouselContent: {
    paddingHorizontal: 16,
  },
  carouselCard: {
    borderRadius: 12,
    padding: 16,
    marginHorizontal: CARD_MARGIN,
  },
  carouselStats: {
    flexDirection: 'row',
    marginBottom: 16,
    marginTop: 8,
  },
  carouselStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  carouselStatLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  carouselStatValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  carouselStatDivider: {
    width: 1,
    marginHorizontal: 16,
  },
  dotContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  barContainer: {
    gap: 8,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  barLabel: {
    width: 60,
    fontSize: 12,
  },
  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 4,
    minWidth: 4,
  },
  barValue: {
    width: 80,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
  },
  netRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  netLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  netValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptyCard: {
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
  paymentHistoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  paymentHistoryContent: {
    flex: 1,
  },
  paymentHistoryTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  paymentHistorySubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  paymentHistoryArrow: {
    fontSize: 20,
    marginLeft: 12,
  },
  footer: {
    height: 40,
  },
});
