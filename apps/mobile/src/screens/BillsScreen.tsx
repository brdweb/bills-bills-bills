import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FlatList, RefreshControl } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  YStack,
  XStack,
  Text,
  Input,
  Spinner,
  Button,
  styled,
} from 'tamagui';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { Bill } from '../types';

// Import shared components
import {
  BillCard,
  FilterTabs,
  FAB,
  EmptyState,
  type BillData,
  type FilterTabOption,
} from '@billmanager/ui';

type BillsStackParamList = {
  BillsList: undefined;
  BillDetail: { billId: number };
  AddBill: undefined;
};

type NavigationProp = NativeStackNavigationProp<BillsStackParamList, 'BillsList'>;

const Container = styled(YStack, {
  flex: 1,
  backgroundColor: '$background',
});

const Header = styled(YStack, {
  backgroundColor: '$surface',
  padding: '$5',
  paddingTop: 60,
  paddingBottom: '$3',
});

const HeaderTop = styled(XStack, {
  justifyContent: 'space-between',
  alignItems: 'center',
});

const HeaderTitle = styled(Text, {
  fontSize: 28,
  fontWeight: 'bold',
  color: '$text',
});

const HeaderSubtitle = styled(Text, {
  fontSize: 14,
  marginTop: '$1',
  color: '$textMuted',
});

const SearchToggle = styled(Button, {
  width: 36,
  height: 36,
  borderRadius: 18,
  backgroundColor: '$border',
  padding: 0,

  variants: {
    active: {
      true: {
        backgroundColor: '$primary',
      },
    },
  } as const,
});

const SearchContainer = styled(XStack, {
  marginTop: '$3',
  alignItems: 'center',
});

const SearchInput = styled(Input, {
  flex: 1,
  backgroundColor: '$background',
  borderColor: '$border',
  borderWidth: 1,
  borderRadius: '$2',
  paddingHorizontal: '$3',
  paddingVertical: '$3',
  fontSize: 16,
  color: '$text',
});

const ClearSearchButton = styled(Button, {
  position: 'absolute',
  right: 8,
  width: 28,
  height: 28,
  borderRadius: 14,
  backgroundColor: '$border',
  padding: 0,
});

const ActiveFilterBanner = styled(XStack, {
  marginTop: '$3',
  padding: '$2',
  borderRadius: '$2',
  borderWidth: 1,
  borderColor: '$primary',
  backgroundColor: '$primary',
  opacity: 0.2,
  justifyContent: 'space-between',
  alignItems: 'center',
});

const ClearAllButton = styled(Button, {
  backgroundColor: '$primary',
  paddingHorizontal: '$3',
  paddingVertical: '$1',
  borderRadius: '$1',
  marginLeft: '$2',
});

const CenteredContainer = styled(YStack, {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: '$background',
});

const RetryButton = styled(Button, {
  backgroundColor: '$primary',
  paddingHorizontal: '$6',
  paddingVertical: '$3',
  borderRadius: '$2',
});

type FilterType = 'all' | 'expense' | 'deposit';

export default function BillsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { currentDatabase, databases } = useAuth();
  const [bills, setBills] = useState<Bill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [showSearch, setShowSearch] = useState(false);

  const fetchBills = useCallback(async () => {
    if (!currentDatabase) return;

    try {
      const response = await api.getBills();
      if (response.success && response.data) {
        const sorted = [...response.data].sort((a, b) => {
          return new Date(a.next_due).getTime() - new Date(b.next_due).getTime();
        });
        setBills(sorted);
        setError(null);
      } else {
        setError(response.error || 'Failed to load bills');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [currentDatabase]);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  useFocusEffect(
    useCallback(() => {
      fetchBills();
    }, [fetchBills])
  );

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchBills();
  }, [fetchBills]);

  const handleBillPress = (bill: BillData) => {
    navigation.navigate('BillDetail', { billId: bill.id });
  };

  const handleAddBill = () => {
    navigation.navigate('AddBill');
  };

  const currentDbInfo = databases.find(db => db.name === currentDatabase);

  const filteredBills = useMemo(() => {
    let result = bills;

    if (filter !== 'all') {
      result = result.filter(bill => bill.type === filter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(bill =>
        bill.name.toLowerCase().includes(query) ||
        (bill.account && bill.account.toLowerCase().includes(query)) ||
        (bill.notes && bill.notes.toLowerCase().includes(query))
      );
    }

    return result;
  }, [bills, filter, searchQuery]);

  const expenses = bills.filter(b => b.type === 'expense');
  const deposits = bills.filter(b => b.type === 'deposit');

  const filterOptions: FilterTabOption<FilterType>[] = [
    { value: 'all', label: 'All', count: bills.length, variant: 'default' },
    { value: 'expense', label: 'Expenses', variant: 'danger' },
    { value: 'deposit', label: 'Income', variant: 'success' },
  ];

  if (isLoading) {
    return (
      <CenteredContainer>
        <Spinner size="large" color="$primary" />
      </CenteredContainer>
    );
  }

  if (error) {
    return (
      <CenteredContainer>
        <Text color="$danger" fontSize={16} marginBottom="$4">
          {error}
        </Text>
        <RetryButton onPress={fetchBills}>
          <Text color="white" fontWeight="600">
            Retry
          </Text>
        </RetryButton>
      </CenteredContainer>
    );
  }

  return (
    <Container>
      <Header>
        <HeaderTop>
          <HeaderTitle>
            {currentDbInfo?.display_name || 'Bills'}
          </HeaderTitle>
          <SearchToggle
            active={showSearch}
            onPress={() => setShowSearch(!showSearch)}
          >
            <Text color={showSearch ? 'white' : '$text'} fontSize={16}>
              {showSearch ? '✕' : '🔍'}
            </Text>
          </SearchToggle>
        </HeaderTop>

        <HeaderSubtitle>
          {expenses.length} expense{expenses.length !== 1 ? 's' : ''} •{' '}
          {deposits.length} deposit{deposits.length !== 1 ? 's' : ''}
        </HeaderSubtitle>

        {showSearch && (
          <SearchContainer>
            <SearchInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search bills..."
              placeholderTextColor="$textMuted"
              autoFocus
            />
            {searchQuery.length > 0 && (
              <ClearSearchButton onPress={() => setSearchQuery('')}>
                <Text color="$text" fontSize={14} fontWeight="600">
                  ✕
                </Text>
              </ClearSearchButton>
            )}
          </SearchContainer>
        )}

        {(filter !== 'all' || searchQuery.length > 0) && (
          <XStack
            marginTop="$3"
            padding="$2"
            borderRadius="$2"
            borderWidth={1}
            borderColor="$primary"
            backgroundColor="rgba(233, 69, 96, 0.1)"
            justifyContent="space-between"
            alignItems="center"
          >
            <Text color="$primary" fontSize={13} fontWeight="500" flex={1}>
              Showing {filter !== 'all' ? (filter === 'expense' ? 'expenses' : 'income') : 'all'}
              {searchQuery.length > 0 ? ` matching "${searchQuery}"` : ''}
              {' '}({filteredBills.length} result{filteredBills.length !== 1 ? 's' : ''})
            </Text>
            <ClearAllButton
              onPress={() => {
                setFilter('all');
                setSearchQuery('');
                setShowSearch(false);
              }}
            >
              <Text color="white" fontSize={12} fontWeight="600">
                Clear All
              </Text>
            </ClearAllButton>
          </XStack>
        )}

        <FilterTabs
          options={filterOptions}
          value={filter}
          onChange={setFilter}
        />
      </Header>

      <FlatList
        data={filteredBills}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <BillCard bill={item as BillData} onPress={handleBillPress} />
        )}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#e94560"
            colors={['#e94560']}
          />
        }
        ListEmptyComponent={
          <EmptyState
            title={searchQuery || filter !== 'all' ? 'No matching bills' : 'No bills yet'}
            subtitle={
              searchQuery || filter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Add your first bill to get started'
            }
          />
        }
      />

      <FAB icon="+" onPress={handleAddBill} />
    </Container>
  );
}
