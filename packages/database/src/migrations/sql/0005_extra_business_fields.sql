-- Company settings, vehicle survey no, invoice reverse charge & PO

ALTER TABLE vehicles ADD COLUMN survey_no TEXT;

ALTER TABLE invoices ADD COLUMN reverse_charges TEXT DEFAULT 'N';
ALTER TABLE invoices ADD COLUMN po_no TEXT;

INSERT OR IGNORE INTO settings (id, key, value, category, description) VALUES
  ('set-co-proprietor', 'company.proprietor', '', 'company', 'Proprietor name'),
  ('set-co-phone2', 'company.phone2', '', 'company', 'Additional phone 1'),
  ('set-co-phone3', 'company.phone3', '', 'company', 'Additional phone 2'),
  ('set-co-phone4', 'company.phone4', '', 'company', 'Additional phone 3');
