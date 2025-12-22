import axios from 'axios';

const api = axios.create({
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
  },
  withCredentials: true,
});

// Only log errors in development, never log request data (may contain passwords)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (import.meta.env.DEV) {
      console.error('API Error:', error.config?.method?.toUpperCase(), error.config?.url, error.response?.status);
    }
    return Promise.reject(error);
  }
);

// Types
export interface User {
  id: number;
  username: string;
  role: 'admin' | 'user';
}

export interface Database {
  id?: number;
  name: string;
  display_name: string;
  description: string;
}

export interface FrequencyConfig {
  dates?: number[];
  days?: number[];
}

export interface Bill {
  id: number;
  name: string;
  amount: number | null;
  varies: boolean;
  frequency: 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
  frequency_type: 'simple' | 'specific_dates' | 'multiple_weekly';
  frequency_config: string;
  next_due: string;
  auto_payment: boolean;
  paid: boolean;
  archived: boolean;
  icon: string;
  type: 'expense' | 'deposit';
  account: string | null;
  created_at: string;
  avg_amount?: number;
}

export interface Payment {
  id: number;
  amount: number;
  payment_date: string;
}

export interface PaymentWithBill extends Payment {
  bill_name: string;
  bill_icon: string;
}

export interface MonthlyBillPayment {
  month: string;
  total: number;
  count: number;
}

export interface LoginResponse {
  message: string;
  role: 'admin' | 'user';
  password_change_required?: boolean;
  user_id?: number;
  change_token?: string;
  databases?: Database[];
}

export interface MeResponse {
  role: 'admin' | 'user';
  current_db: string | null;
  databases: Database[];
}

// Auth API
export const login = (username: string, password: string) =>
  api.post<LoginResponse>('/login', { username, password });

export const logout = () => api.post('/logout');

export const getMe = () => api.get<MeResponse>('/me');

export const changePassword = (
  user_id: number,
  change_token: string,
  current_password: string,
  new_password: string
) =>
  api.post<{ message: string; role: string; databases: Database[] }>('/change-password', {
    user_id,
    change_token,
    current_password,
    new_password,
  });

// Database API
export const selectDatabase = (dbName: string) => api.post(`/select-db/${dbName}`);

export const getDatabases = () => api.get<Database[]>('/databases');

export const createDatabase = (name: string, display_name: string, description: string) =>
  api.post('/databases', { name, display_name, description });

export const deleteDatabase = (dbId: number) => api.delete(`/databases/${dbId}`);

export const getDatabaseAccess = (dbId: number) =>
  api.get<User[]>(`/databases/${dbId}/access`);

export const grantDatabaseAccess = (dbId: number, userId: number) =>
  api.post(`/databases/${dbId}/access`, { user_id: userId });

export const revokeDatabaseAccess = (dbId: number, userId: number) =>
  api.delete(`/databases/${dbId}/access/${userId}`);

// User API
export const getUsers = () => api.get<User[]>('/users');

export const addUser = (
  username: string,
  password: string,
  role: string,
  database_ids: number[]
) => api.post('/users', { username, password, role, database_ids });

export const deleteUser = (userId: number) => api.delete(`/users/${userId}`);

export const getUserDatabases = (userId: number) =>
  api.get<Database[]>(`/users/${userId}/databases`);

// Bills API
export const getBills = (includeArchived = false, type?: 'expense' | 'deposit') => {
  let url = `/bills${includeArchived ? '?include_archived=true' : ''}`;
  if (type) {
    url += includeArchived ? `&type=${type}` : `?type=${type}`;
  }
  return api.get<Bill[]>(url);
};

export const addBill = (bill: Partial<Bill>) => api.post('/bills', bill);

export const getAccounts = () => api.get<string[]>('/api/accounts');

export const updateBill = (id: number, bill: Partial<Bill>) =>
  api.put(`/bills/${id}`, bill);

export const archiveBill = (id: number) => api.delete(`/bills/${id}`);

export const unarchiveBill = (id: number) => api.post(`/bills/${id}/unarchive`);

export const deleteBillPermanent = (id: number) => api.delete(`/bills/${id}/permanent`);

export const payBill = (id: number, amount: number, advance_due: boolean) =>
  api.post(`/bills/${id}/pay`, { amount, advance_due });

// Payments API
export const getPayments = (billId: number) =>
  api.get<Payment[]>(`/bills/${billId}/payments`);

export const updatePayment = (id: number, amount: number, payment_date: string) =>
  api.put(`/payments/${id}`, { amount, payment_date });

export const deletePayment = (id: number) => api.delete(`/payments/${id}`);

export const getMonthlyPayments = () =>
  api.get<Record<string, number>>('/api/payments/monthly');

export const getAllPayments = () =>
  api.get<PaymentWithBill[]>('/api/payments/all');

export const getBillMonthlyPayments = (billName: string) =>
  api.get<MonthlyBillPayment[]>(`/api/payments/bill/${encodeURIComponent(billName)}/monthly`);

// Auto-payment API
export const processAutoPayments = () => api.post('/api/process-auto-payments');

// Version API
export const getVersion = () => api.get<{ version: string; features: string[] }>('/api/version');

// App Config API (v2)
export interface AppConfig {
  deployment_mode: 'saas' | 'self-hosted';
  billing_enabled: boolean;
  registration_enabled: boolean;
  email_verification_required: boolean;
}

export interface AppConfigResponse {
  success: boolean;
  data: AppConfig;
}

export const getAppConfig = () =>
  api.get<AppConfigResponse>('/api/v2/config');

// Registration & Auth API (v2)
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export const register = (data: RegisterRequest) =>
  api.post<AuthResponse>('/api/v2/auth/register', data);

export const verifyEmail = (token: string) =>
  api.post<AuthResponse>('/api/v2/auth/verify-email', { token });

export const resendVerification = (email: string) =>
  api.post<AuthResponse>('/api/v2/auth/resend-verification', { email });

export const forgotPassword = (email: string) =>
  api.post<AuthResponse>('/api/v2/auth/forgot-password', { email });

export const resetPassword = (token: string, password: string) =>
  api.post<AuthResponse>('/api/v2/auth/reset-password', { token, password });

// Billing API (v2)
export interface BillingConfig {
  publishable_key: string;
  enabled: boolean;
}

export interface TierLimits {
  bills: number;
  users: number;
  bill_groups: number;
  export: boolean;
  full_analytics: boolean;
  priority_support: boolean;
}

export interface SubscriptionStatus {
  has_subscription: boolean;
  status?: string;
  plan?: string;
  tier?: string;
  effective_tier?: string;
  billing_interval?: string;
  limits?: TierLimits;
  is_active?: boolean;
  is_trialing?: boolean;
  is_trial_expired?: boolean;
  trial_ends_at?: string;
  current_period_end?: string;
  cancel_at_period_end?: boolean;
  in_trial?: boolean;
  trial_days_remaining?: number;
  days_until_renewal?: number;
}

export interface UsageInfo {
  used: number;
  limit: number;
  unlimited: boolean;
}

export interface BillingUsage {
  tier: string;
  is_saas: boolean;
  limits: TierLimits;
  usage: {
    bills: UsageInfo;
    bill_groups: UsageInfo;
  };
}

export interface CheckoutResponse {
  success: boolean;
  url?: string;
  error?: string;
}

export const getBillingConfig = () =>
  api.get<BillingConfig>('/api/v2/billing/config');

export const getSubscriptionStatus = () =>
  api.get<{ success: boolean; data: SubscriptionStatus }>('/api/v2/billing/status');

export const getBillingUsage = () =>
  api.get<{ success: boolean; data: BillingUsage }>('/api/v2/billing/usage');

export const createCheckoutSession = (tier: string = 'basic', interval: string = 'monthly') =>
  api.post<CheckoutResponse>('/api/v2/billing/create-checkout', { tier, interval });

export const createPortalSession = () =>
  api.post<CheckoutResponse>('/api/v2/billing/portal');

export default api;
