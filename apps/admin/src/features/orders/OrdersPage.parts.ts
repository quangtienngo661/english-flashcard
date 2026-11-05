import type { OrderStatus } from './orders-api';

/** The badge colour of an order's status: money in, waiting, or something staff have to look at. */
export const STATUS_TONE: Record<OrderStatus, 'success' | 'primary' | 'warning' | 'danger' | 'neutral'> = {
  paid: 'success', pending: 'primary', needs_review: 'warning', expired: 'neutral', cancelled: 'neutral', failed: 'danger', closed: 'neutral',
};

export const statusTone = (status: OrderStatus) => STATUS_TONE[status];
