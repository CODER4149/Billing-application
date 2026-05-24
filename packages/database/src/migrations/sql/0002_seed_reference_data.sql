-- Seed reference data (roles, permissions, invoice statuses, default settings)
-- Actual user/branch seed is done programmatically in seed.ts for bcrypt hashing

INSERT OR IGNORE INTO invoice_statuses (id, code, label, sort_order, color) VALUES
  ('st-draft', 'draft', 'Draft', 1, '#94a3b8'),
  ('st-ready', 'ready_to_bill', 'Ready to Bill', 2, '#60a5fa'),
  ('st-sent', 'sent_for_billing', 'Sent for Billing', 3, '#818cf8'),
  ('st-generated', 'invoice_generated', 'Invoice Generated', 4, '#a78bfa'),
  ('st-pending', 'payment_pending', 'Payment Pending', 5, '#fbbf24'),
  ('st-partial', 'partially_paid', 'Partially Paid', 6, '#fb923c'),
  ('st-paid', 'paid', 'Paid', 7, '#22c55e'),
  ('st-overdue', 'overdue', 'Overdue', 8, '#ef4444'),
  ('st-cancelled', 'cancelled', 'Cancelled', 9, '#64748b');
