-- Add total_fee column to fee_payments table
ALTER TABLE fee_payments ADD COLUMN IF NOT EXISTS total_fee NUMERIC;

-- For existing records, assume the paid amount was the total fee
UPDATE fee_payments SET total_fee = amount WHERE total_fee IS NULL;

-- Make total_fee required for future inserts
ALTER TABLE fee_payments ALTER COLUMN total_fee SET NOT NULL;
