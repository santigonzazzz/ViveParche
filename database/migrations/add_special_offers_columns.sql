-- Add special offers columns to venues table
ALTER TABLE venues ADD COLUMN IF NOT EXISTS special_offers_pdf_url TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS special_offers_text TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS special_offers_json JSONB DEFAULT '[]';

COMMENT ON COLUMN venues.special_offers_pdf_url IS 'URL to the uploaded special offers PDF file';
COMMENT ON COLUMN venues.special_offers_text IS 'Extracted text from the special offers PDF for AI processing';
COMMENT ON COLUMN venues.special_offers_json IS 'List of manual special offers (max 10), each with name, description, and price';
