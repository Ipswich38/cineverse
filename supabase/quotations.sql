-- E-quotation columns on the existing quote-request row. One editable quotation
-- per request: JSON document, lifecycle status, and the saved PDF copy's path.
alter table public.vissionlink_quote_requests
  add column if not exists quotation jsonb,
  add column if not exists quotation_status text not null default 'none', -- none | draft | sent
  add column if not exists quotation_pdf_path text,
  add column if not exists quotation_sent_at timestamptz;
