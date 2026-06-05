-- E-contract and e-invoice on the same quote-request row, downstream of the
-- agreed quotation. Each is one editable JSON document with its own lifecycle
-- status and a stored PDF copy — mirroring the quotation columns.
alter table public.vissionlink_quote_requests
  -- When the client agreed to the quotation (gates contract/invoice creation).
  add column if not exists quotation_agreed_at timestamptz,
  -- E-contract (rental agreement).
  add column if not exists contract jsonb,
  add column if not exists contract_status text not null default 'none', -- none | draft | sent | signed
  add column if not exists contract_pdf_path text,
  add column if not exists contract_sent_at timestamptz,
  -- E-invoice (billing).
  add column if not exists invoice jsonb,
  add column if not exists invoice_status text not null default 'none', -- none | draft | sent
  add column if not exists invoice_pdf_path text,
  add column if not exists invoice_sent_at timestamptz;
