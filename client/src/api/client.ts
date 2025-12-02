import axios from 'axios';

const api = axios.create({
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

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
  created_at: string;
  avg_amount?: number;
}

export interface Payment {
  id: number;
  amount: number;
  payment_date: string;
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
export const getBills = (includeArchived = false) =>
  api.get<Bill[]>(`/bills${includeArchived ? '?include_archived=true' : ''}`);

export const addBill = (bill: Partial<Bill>) => api.post('/bills', bill);

export const updateBill = (id: number, bill: Partial<Bill>) =>
  api.put(`/bills/${id}`, bill);

export const archiveBill = (id: number) => api.delete(`/bills/${id}`);

export const unarchiveBill = (id: number) => api.post(`/bills/${id}/unarchive`);

export const deleteBillPermanent = (id: number) => api.delete(`/bills/${id}/permanent`);

export const payBill = (id: number, amount: number, advance_due: boolean) =>
  api.post(`/bills/${id}/pay`, { amount, advance_due });

// Payments API
export const getPayments = (billName: string) =>
  api.get<Payment[]>(`/bills/${encodeURIComponent(billName)}/payments`);

export const updatePayment = (id: number, amount: number, payment_date: string) =>
  api.put(`/payments/${id}`, { amount, payment_date });

export const deletePayment = (id: number) => api.delete(`/payments/${id}`);

export const getMonthlyPayments = () =>
  api.get<Record<string, number>>('/api/payments/monthly');

// Auto-payment API
export const processAutoPayments = () => api.post('/api/process-auto-payments');

// Version API
export const getVersion = () => api.get<{ version: string; features: string[] }>('/api/version');

export default api;
