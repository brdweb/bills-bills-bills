import { useState, useEffect, useCallback, useMemo } from 'react';
import { Stack, Loader, Center, Divider, Text, Anchor } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Sidebar } from './components/Sidebar';
import { BillList } from './components/BillList';
import { BillModal } from './components/BillModal';
import { PayModal } from './components/PayModal';
import { PaymentHistory } from './components/PaymentHistory';
import { Calendar } from './components/Calendar';
import { LoginModal } from './components/LoginModal';
import { PasswordChangeModal } from './components/PasswordChangeModal';
import { AdminModal } from './components/AdminPanel/AdminModal';
import { MonthlyTotalsChart } from './components/MonthlyTotalsChart';
import { AllPayments } from './pages/AllPayments';
import { useAuth } from './context/AuthContext';
import * as api from './api/client';
import type { Bill } from './api/client';
import { archiveBill, unarchiveBill, deleteBillPermanent } from './api/client';

// Filter types
export type DateRangeFilter = 'all' | 'overdue' | 'thisWeek' | 'nextWeek' | 'next21Days' | 'next30Days';

export interface BillFilter {
  searchQuery: string;
  dateRange: DateRangeFilter;
  selectedDate: string | null; // YYYY-MM-DD format
  type: 'all' | 'expense' | 'deposit';
  account: string | null;
}

function App() {
  const { isLoggedIn, isLoading, pendingPasswordChange, currentDb } = useAuth();
  const navigate = useNavigate();

  // Bills state
  const [bills, setBills] = useState<Bill[]>([]);
  const [billsLoading, setBillsLoading] = useState(false);

  // Filter state
  const [filter, setFilter] = useState<BillFilter>({
    searchQuery: '',
    dateRange: 'all',
    selectedDate: null,
    type: 'all',
    account: null,
  });

  // Modal states
  const [loginOpened, { open: openLogin, close: closeLogin }] = useDisclosure(false);
  const [adminOpened, { open: openAdmin, close: closeAdmin }] = useDisclosure(false);
  const [billModalOpened, { open: openBillModal, close: closeBillModal }] = useDisclosure(false);
  const [payModalOpened, { open: openPayModal, close: closePayModal }] = useDisclosure(false);
  const [historyOpened, { open: openHistory, close: closeHistory }] = useDisclosure(false);
  const [chartOpened, { open: openChart, close: closeChart }] = useDisclosure(false);

  // Current editing/paying bill
  const [currentBill, setCurrentBill] = useState<Bill | null>(null);
  const [historyBillId, setHistoryBillId] = useState<number | null>(null);
  const [historyBillName, setHistoryBillName] = useState<string | null>(null);

  // Filtered bills based on current filter
  const filteredBills = useMemo(() => {
    let result = bills;

    // Apply search query filter - if searching, include archived bills, otherwise hide them
    if (filter.searchQuery.trim()) {
      const query = filter.searchQuery.toLowerCase();
      result = result.filter((bill) => {
        const nameMatch = bill.name.toLowerCase().includes(query);
        const amountMatch = bill.amount?.toString().includes(query);
        const dateMatch = bill.next_due.includes(query);
        return nameMatch || amountMatch || dateMatch;
      });
    } else {
      // When not searching, hide archived bills
      result = result.filter((bill) => !bill.archived);
    }

    // Apply type filter
    if (filter.type !== 'all') {
      result = result.filter((bill) => bill.type === filter.type);
    }

    // Apply account filter
    if (filter.account) {
      result = result.filter((bill) => bill.account === filter.account);
    }

    // Apply date range filter
    if (filter.dateRange !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const oneDay = 24 * 60 * 60 * 1000;

      // Special handling for overdue filter
      if (filter.dateRange === 'overdue') {
        result = result.filter((bill) => {
          // Parse date directly to avoid timezone issues
          const [year, month, day] = bill.next_due.split('-').map(Number);
          const dueDate = new Date(year, month - 1, day);
          dueDate.setHours(0, 0, 0, 0);
          return dueDate < today;
        });
      } else {
        let startDate = today;
        let endDate: Date;

        switch (filter.dateRange) {
          case 'thisWeek':
            endDate = new Date(today.getTime() + 7 * oneDay);
            break;
          case 'nextWeek':
            startDate = new Date(today.getTime() + 7 * oneDay);
            endDate = new Date(today.getTime() + 14 * oneDay);
            break;
          case 'next21Days':
            endDate = new Date(today.getTime() + 21 * oneDay);
            break;
          case 'next30Days':
            endDate = new Date(today.getTime() + 30 * oneDay);
            break;
          default:
            endDate = new Date(today.getTime() + 365 * oneDay);
        }

        result = result.filter((bill) => {
          // Parse date directly to avoid timezone issues
          const [year, month, day] = bill.next_due.split('-').map(Number);
          const dueDate = new Date(year, month - 1, day);
          dueDate.setHours(0, 0, 0, 0);
          return dueDate >= startDate && dueDate < endDate;
        });
      }
    }

    // Apply specific date filter
    if (filter.selectedDate) {
      result = result.filter((bill) => bill.next_due === filter.selectedDate);
    }

    return result;
  }, [bills, filter]);

  // Fetch bills
  const fetchBills = useCallback(async () => {
    if (!isLoggedIn || !currentDb) {
      setBills([]);
      return;
    }

    setBillsLoading(true);
    try {
      // Process auto-payments first
      await api.processAutoPayments();
      // Then fetch bills (include archived so they can be searched)
      const response = await api.getBills(true);
      setBills(response.data);
    } catch (error) {
      console.error('Failed to fetch bills:', error);
      setBills([]);
    } finally {
      setBillsLoading(false);
    }
  }, [isLoggedIn, currentDb]);

  // Fetch bills when logged in or database changes
  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  // Handle password change required
  const [passwordChangeOpened, setPasswordChangeOpened] = useState(false);

  useEffect(() => {
    if (pendingPasswordChange) {
      setPasswordChangeOpened(true);
    }
  }, [pendingPasswordChange]);

  // Bill actions
  const handleAddBill = () => {
    console.log('➕ App: handleAddBill called');
    setCurrentBill(null);
    openBillModal();
  };

  const handleEditBill = (bill: Bill) => {
    console.log('📝 App: handleEditBill called', bill);
    setCurrentBill(bill);
    openBillModal();
  };

  const handlePayBill = (bill: Bill) => {
    setCurrentBill(bill);
    openPayModal();
  };

  const handleViewPayments = (bill: Bill) => {
    setHistoryBillId(bill.id);
    setHistoryBillName(bill.name);
    openHistory();
  };

  const handleSaveBill = async (billData: Partial<Bill>) => {
    if (currentBill) {
      await api.updateBill(currentBill.id, billData);
    } else {
      await api.addBill(billData);
    }
    await fetchBills();
  };

  const handleArchiveBill = async (bill: Bill) => {
    await archiveBill(bill.id);
    await fetchBills();
  };

  const handleDeleteBill = async (bill: Bill) => {
    await deleteBillPermanent(bill.id);
    await fetchBills();
  };

  const handleUnarchiveBill = async (bill: Bill) => {
    await unarchiveBill(bill.id);
    await fetchBills();
  };

  const handlePay = async (amount: number, advanceDue: boolean) => {
    if (!currentBill) return;
    await api.payBill(currentBill.id, amount, advanceDue);
    await fetchBills();
  };

  if (isLoading) {
    return (
      <Center h="100vh">
        <Loader size="xl" />
      </Center>
    );
  }

  return (
    <>
      <Layout
        onLoginClick={openLogin}
        onAdminClick={openAdmin}
        sidebar={
          <Stack gap="xs">
            <Sidebar
              bills={bills}
              isLoggedIn={isLoggedIn}
              filter={filter}
              onFilterChange={setFilter}
              onShowChart={openChart}
              onShowAllPayments={() => navigate('/all-payments')}
            />
            {isLoggedIn && (
              <>
                <Calendar
                  bills={bills}
                  selectedDate={filter.selectedDate}
                  onDateSelect={(date) =>
                    setFilter((prev) => ({
                      ...prev,
                      selectedDate: date === prev.selectedDate ? null : date,
                      dateRange: 'all', // Clear date range when specific date selected
                    }))
                  }
                />
                <Divider />
                <Text size="xs" c="dimmed" ta="center">
                  Bills Bills Bills v3.0.1 - Licensed under{' '}
                  <Anchor href="https://osaasy.dev/" target="_blank" size="xs">
                    O'Saasy
                  </Anchor>
                </Text>
              </>
            )}
          </Stack>
        }
      >
        <Routes>
          <Route
            path="/"
            element={
              billsLoading ? (
                <Center py="xl">
                  <Loader />
                </Center>
              ) : (
                <BillList
                  bills={filteredBills}
                  onEdit={handleEditBill}
                  onPay={handlePayBill}
                  onAdd={handleAddBill}
                  onViewPayments={handleViewPayments}
                  isLoggedIn={isLoggedIn}
                  hasDatabase={!!currentDb}
                  hasActiveFilter={filter.searchQuery !== '' || filter.dateRange !== 'all' || filter.selectedDate !== null}
                  onClearFilter={() => setFilter({ searchQuery: '', dateRange: 'all', selectedDate: null, type: 'all', account: null })}
                  searchQuery={filter.searchQuery}
                  onSearchChange={(query) => setFilter((prev) => ({ ...prev, searchQuery: query }))}
                  filter={filter}
                  onFilterChange={setFilter}
                />
              )
            }
          />
          <Route path="/all-payments" element={<AllPayments />} />
        </Routes>
      </Layout>

      {/* Modals */}
      <LoginModal
        opened={loginOpened}
        onClose={closeLogin}
        onPasswordChangeRequired={() => setPasswordChangeOpened(true)}
      />

      <PasswordChangeModal
        opened={passwordChangeOpened}
        onClose={() => setPasswordChangeOpened(false)}
      />

      <AdminModal opened={adminOpened} onClose={closeAdmin} />

      <BillModal
        opened={billModalOpened}
        onClose={closeBillModal}
        onSave={handleSaveBill}
        onArchive={handleArchiveBill}
        onUnarchive={handleUnarchiveBill}
        onDelete={handleDeleteBill}
        bill={currentBill}
      />

      <PayModal
        opened={payModalOpened}
        onClose={closePayModal}
        onPay={handlePay}
        bill={currentBill}
      />

      <PaymentHistory
        opened={historyOpened}
        onClose={closeHistory}
        billId={historyBillId}
        billName={historyBillName}
        onPaymentsChanged={fetchBills}
      />

      <MonthlyTotalsChart opened={chartOpened} onClose={closeChart} />
    </>
  );
}

export default App;
