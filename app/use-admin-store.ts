"use client";

import { useCallback, useEffect, useState } from "react";

export type Customer = {
  id: string;
  name: string;
  phone: string;
  document: string;
  creditLimitCents: number;
  notes: string;
  active: boolean;
  balanceCents: number;
  createdAt: string;
  updatedAt: string;
};

export type LedgerEntry = {
  id: string;
  customerId: string;
  customerName: string;
  type: "debit" | "payment";
  amountCents: number;
  description: string;
  saleId: string | null;
  dueDate: string | null;
  createdAt: string;
};

export type Expense = {
  id: string;
  description: string;
  category: string;
  amountCents: number;
  dueDate: string | null;
  paidAt: string | null;
  createdAt: string;
};

export type Supplier = {
  id: string;
  name: string;
  contact: string;
  phone: string;
  notes: string;
  createdAt: string;
};

export type StaffMember = {
  id: string;
  name: string;
  role: string;
  permissions: string[];
  active: boolean;
  createdAt: string;
};

export type AppSettings = {
  business_name?: string;
  whatsapp_number?: string;
};

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  const result = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(result.error || "Não foi possível concluir a operação.");
  }
  return result;
}

export function useAdminStore() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [settings, setSettings] = useState<AppSettings>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setError("");
    try {
      const [
        customerData,
        ledgerData,
        expenseData,
        supplierData,
        staffData,
        settingsData,
      ] = await Promise.all([
        api<{ customers: Customer[] }>("/api/customers"),
        api<{ entries: LedgerEntry[] }>("/api/customer-ledger"),
        api<{ expenses: Expense[] }>("/api/expenses"),
        api<{ suppliers: Supplier[] }>("/api/suppliers"),
        api<{ staff: StaffMember[] }>("/api/staff"),
        api<{ settings: AppSettings }>("/api/settings"),
      ]);
      setCustomers(customerData.customers);
      setLedger(ledgerData.entries);
      setExpenses(expenseData.expenses);
      setSuppliers(supplierData.suppliers);
      setStaff(staffData.staff);
      setSettings(settingsData.settings);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Falha ao carregar módulos administrativos.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  async function send(url: string, method: "POST" | "PATCH", body: unknown) {
    await api(url, { method, body: JSON.stringify(body) });
    await refresh();
  }

  return {
    customers,
    ledger,
    expenses,
    suppliers,
    staff,
    settings,
    loading,
    error,
    refresh,
    createCustomer: (body: unknown) => send("/api/customers", "POST", body),
    updateCustomer: (body: unknown) => send("/api/customers", "PATCH", body),
    addLedgerEntry: (body: unknown) =>
      send("/api/customer-ledger", "POST", body),
    createExpense: (body: unknown) => send("/api/expenses", "POST", body),
    toggleExpense: (id: string, paid: boolean) =>
      send("/api/expenses", "PATCH", { id, paid }),
    createSupplier: (body: unknown) => send("/api/suppliers", "POST", body),
    archiveSupplier: (id: string) =>
      send("/api/suppliers", "PATCH", { id, active: false }),
    createStaff: (body: unknown) => send("/api/staff", "POST", body),
    updateStaffPermissions: (id: string, permissions: string[]) =>
      send("/api/staff", "PATCH", { id, permissions }),
    saveSettings: (body: AppSettings) => send("/api/settings", "PATCH", body),
  };
}
