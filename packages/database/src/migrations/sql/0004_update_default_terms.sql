-- Update default invoice terms and conditions
UPDATE settings SET value = 'Subject to Pune Jurisdiction.|GST is additional as per valuation and registration.|All above information are true and correct.'
WHERE key = 'invoice.default_terms';
