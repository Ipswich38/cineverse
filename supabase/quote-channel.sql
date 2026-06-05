-- Where a quote request came from: 'web' (storefront form) or 'direct' (admin
-- created it for a call / walk-in client). Existing rows default to 'web'.
alter table public.vissionlink_quote_requests
  add column if not exists channel text not null default 'web';
