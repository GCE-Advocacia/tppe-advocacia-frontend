import { apiRequest } from './api';

/**
 * O módulo /payments do backend devolve o recurso cru (sem o envelope
 * { success, data } usado nos demais módulos) — as funções abaixo seguem
 * o contrato real da API.
 */
export type Payment = {
  id: number;
  client_id: number;
  payment_date: string;
  amount: string | number | null;
  description: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
};

export type PaymentWrite = {
  client_id: number;
  payment_date: string;
  amount: number | null;
  description: string | null;
};

export type PaymentUpdate = Partial<PaymentWrite>;

/** Situação derivada da data de vencimento (o backend ainda não guarda status). */
export type PaymentSituation = 'VENCIDO' | 'HOJE' | 'A_VENCER';

export const SITUATION_LABEL: Record<PaymentSituation, string> = {
  VENCIDO: 'Pendente (vencido)',
  HOJE: 'Vence hoje',
  A_VENCER: 'A vencer',
};

export const SITUATION_COLOR: Record<PaymentSituation, string> = {
  VENCIDO: '#A52020',
  HOJE: '#B26A00',
  A_VENCER: '#1E7A46',
};

export function paymentSituation(paymentDate: string, todayYMD: string): PaymentSituation {
  if (paymentDate < todayYMD) return 'VENCIDO';
  if (paymentDate === todayYMD) return 'HOJE';
  return 'A_VENCER';
}

export function paymentAmount(value: Payment['amount']): number {
  if (value === null || value === '') return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export async function listPayments(params: {
  start_date?: string;
  end_date?: string;
} = {}): Promise<Payment[]> {
  const query = new URLSearchParams();
  if (params.start_date) query.set('start_date', params.start_date);
  if (params.end_date) query.set('end_date', params.end_date);
  const suffix = query.toString() ? `?${query}` : '';
  return apiRequest<Payment[]>(`/payments${suffix}`);
}

export async function createPayment(payload: PaymentWrite): Promise<Payment> {
  return apiRequest<Payment>('/payments', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updatePayment(paymentId: number, payload: PaymentUpdate): Promise<Payment> {
  return apiRequest<Payment>(`/payments/${paymentId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deletePayment(paymentId: number): Promise<void> {
  await apiRequest(`/payments/${paymentId}`, { method: 'DELETE' });
}
