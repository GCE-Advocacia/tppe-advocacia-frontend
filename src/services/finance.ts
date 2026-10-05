import { apiRequest, PaginatedResponse, SuccessResponse } from './api';

export type TransactionType = 'INCOME' | 'EXPENSE';

export type FinanceTransaction = {
  id: number;
  description: string;
  /** Decimal serializado como string pelo backend — nunca converter no POST. */
  amount: string;
  transaction_date: string;
  type: TransactionType;
  created_at: string;
  updated_at: string;
};

export type FinanceTransactionCreate = {
  description: string;
  /** Deve usar ponto como separador decimal (ex: "1500.50"). */
  amount: string;
  transaction_date: string;
};

export type FinanceSummary = {
  date_from: string | null;
  date_to: string | null;
  total_income: string;
  total_expense: string;
  balance: string;
};

export type FinancePeriod = {
  date_from?: string;
  date_to?: string;
};

function periodQuery(params?: FinancePeriod): URLSearchParams {
  const q = new URLSearchParams();
  if (params?.date_from) q.set('date_from', params.date_from);
  if (params?.date_to)   q.set('date_to', params.date_to);
  return q;
}

export async function listTransactions(
  params?: FinancePeriod & { page?: number; limit?: number },
): Promise<PaginatedResponse<FinanceTransaction>> {
  const q = periodQuery(params);
  if (params?.page)  q.set('page', String(params.page));
  if (params?.limit) q.set('limit', String(params.limit));
  return apiRequest(`/finance/transactions?${q}`);
}

export async function getFinanceSummary(params?: FinancePeriod): Promise<FinanceSummary> {
  const res = await apiRequest<SuccessResponse<FinanceSummary>>(
    `/finance/summary?${periodQuery(params)}`,
  );
  return res.data;
}

export async function createIncome(payload: FinanceTransactionCreate): Promise<FinanceTransaction> {
  const res = await apiRequest<SuccessResponse<FinanceTransaction>>('/finance/incomes', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function createExpense(payload: FinanceTransactionCreate): Promise<FinanceTransaction> {
  const res = await apiRequest<SuccessResponse<FinanceTransaction>>('/finance/expenses', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res.data;
}
