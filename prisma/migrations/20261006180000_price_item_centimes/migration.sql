-- Preserve all existing integer values while accepting validated two-decimal unit prices.
-- Final quotation money calculations round at the cent and validate low <= mid <= high.
ALTER TABLE "PriceItem"
  ALTER COLUMN "low" TYPE DOUBLE PRECISION USING "low"::DOUBLE PRECISION,
  ALTER COLUMN "mid" TYPE DOUBLE PRECISION USING "mid"::DOUBLE PRECISION,
  ALTER COLUMN "high" TYPE DOUBLE PRECISION USING "high"::DOUBLE PRECISION;
