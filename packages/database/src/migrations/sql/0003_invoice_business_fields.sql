-- Invoice & business field enhancements

ALTER TABLE clients ADD COLUMN secondary_phone TEXT;
ALTER TABLE clients ADD COLUMN office_phone TEXT;
ALTER TABLE clients ADD COLUMN state_code TEXT;
ALTER TABLE clients ADD COLUMN district TEXT;
ALTER TABLE clients ADD COLUMN taluka TEXT;
ALTER TABLE clients ADD COLUMN village TEXT;
ALTER TABLE clients ADD COLUMN survey_no TEXT;
ALTER TABLE clients ADD COLUMN gat_no TEXT;
ALTER TABLE clients ADD COLUMN site_code TEXT;
ALTER TABLE clients ADD COLUMN billing_address TEXT;
ALTER TABLE clients ADD COLUMN site_address TEXT;
ALTER TABLE clients ADD COLUMN site_city TEXT;
ALTER TABLE clients ADD COLUMN site_state TEXT;
ALTER TABLE clients ADD COLUMN site_district TEXT;
ALTER TABLE clients ADD COLUMN site_taluka TEXT;
ALTER TABLE clients ADD COLUMN site_village TEXT;
ALTER TABLE clients ADD COLUMN site_survey_no TEXT;
ALTER TABLE clients ADD COLUMN site_gat_no TEXT;

UPDATE clients SET billing_address = address WHERE billing_address IS NULL AND address IS NOT NULL;

ALTER TABLE vehicles ADD COLUMN driver_name TEXT;
ALTER TABLE vehicles ADD COLUMN operator_name TEXT;
ALTER TABLE vehicles ADD COLUMN transport_details TEXT;

ALTER TABLE invoices ADD COLUMN vehicle_id TEXT REFERENCES vehicles(id);
ALTER TABLE invoices ADD COLUMN consignee_id TEXT REFERENCES clients(id);
ALTER TABLE invoices ADD COLUMN amount_in_words TEXT;
ALTER TABLE invoices ADD COLUMN terms_and_conditions TEXT;
ALTER TABLE invoices ADD COLUMN driver_name TEXT;
ALTER TABLE invoices ADD COLUMN operator_name TEXT;
ALTER TABLE invoices ADD COLUMN transport_details TEXT;
ALTER TABLE invoices ADD COLUMN receiver_name TEXT;
ALTER TABLE invoices ADD COLUMN site_state TEXT;
ALTER TABLE invoices ADD COLUMN site_state_code TEXT;
ALTER TABLE invoices ADD COLUMN site_city TEXT;
ALTER TABLE invoices ADD COLUMN site_district TEXT;
ALTER TABLE invoices ADD COLUMN site_taluka TEXT;
ALTER TABLE invoices ADD COLUMN site_village TEXT;
ALTER TABLE invoices ADD COLUMN site_survey_no TEXT;
ALTER TABLE invoices ADD COLUMN site_gat_no TEXT;
ALTER TABLE invoices ADD COLUMN site_code TEXT;
ALTER TABLE invoices ADD COLUMN site_address TEXT;

UPDATE invoices SET terms_and_conditions = terms WHERE terms_and_conditions IS NULL AND terms IS NOT NULL;

INSERT OR IGNORE INTO settings (id, key, value, category, description) VALUES
  ('set-inv-terms', 'invoice.default_terms',
   'Subject to Pune Jurisdiction.|GST is additional as per valuation and registration.|All above information are true and correct.',
   'invoice', 'Default invoice terms and conditions');

UPDATE settings SET value = 'Bhagyalaxmi Borewell' WHERE key = 'company.name';
