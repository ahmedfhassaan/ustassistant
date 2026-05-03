## Goal
Add the university website (ust.edu) as a second knowledge source. Pages are crawled, converted to Markdown, embedded, and indexed in the same RAG pipeline used for uploaded documents — so answers and citations work identically for both sources.

## Approach
Reuse the existing `knowledge_documents` + `knowledge_chunks` pipeline. A web page becomes a `knowledge_document` with `file_type = 'web'` and a `source_url`. No parallel system, no live search at query time.

## Architecture

```text
Cron (weekly)  ──►  crawl-website Edge Function  ──►  Firecrawl /v2/crawl (ust.edu)
                                │
                                ▼
                  For each page (markdown + url + title)
                                │
                                ▼
              knowledge_documents (file_type='web', source_url=...)
              knowledge_chunks   (600-word chunks + embeddings)
                                │
                                ▼
                Existing chat function — search_knowledge_hybrid
                Citations show: document name + clickable source_url
```

## Database changes (one migration)

Add to `knowledge_documents`:
- `source_url text` — the page URL (NULL for uploaded docs)
- `source_type text default 'manual'` — `'manual'` | `'web'`
- `last_crawled_at timestamptz`
- `content_hash text` — to skip re-embedding unchanged pages

Add to `assistant_settings` (rows, not columns):
- `web_crawl_enabled = 'true'`
- `web_crawl_root_url = 'https://www.ust.edu'`
- `web_crawl_last_run_at` — timestamp of last successful crawl
- `web_crawl_last_status` — `success` / `failed` / message

## New Edge Function: `crawl-website`
- Reads `web_crawl_root_url` from settings
- Calls Firecrawl `/v2/crawl` with `formats: ['markdown']`, no page limit
- Polls crawl status until completed
- For each page:
  1. Compute `content_hash` (sha256 of markdown)
  2. If a `knowledge_document` with same `source_url` exists and same hash → skip
  3. Otherwise: upsert document, delete old chunks, re-chunk (600 words), embed, insert
- Updates `web_crawl_last_run_at` + status
- Auth: requires admin header (same pattern as other admin functions)

## Scheduled job
Use `pg_cron` + `pg_net` to invoke `crawl-website` weekly (Sundays 03:00 UTC).

## UI changes (`/admin/knowledge`)

Add a compact "مصدر الويب" card above the documents list:
- Toggle: enabled/disabled
- Root URL input (defaults to `https://www.ust.edu`)
- "آخر تحديث" timestamp + status badge
- "تحديث الآن" button → invokes `crawl-website`
- In the documents table, add a small badge: `يدوي` / `موقع` to distinguish source type, and make the row clickable to open `source_url` for web docs.

## Chat answer changes (minor)
In `supabase/functions/chat/index.ts`, when building the source label for a chunk:
- If document has `source_url` → label becomes `document_name` + URL appended (so the existing source line in `ChatMessage.tsx` can render it)
- Pass `source_url` through the meta SSE event so the UI can render the source as a link

## Secrets
Requires `FIRECRAWL_API_KEY`. I will use the **Firecrawl connector** (no manual secret) — the user picks their Firecrawl connection through the standard picker.

## Files

**New**
- `supabase/migrations/<ts>_web_source.sql` — schema additions + settings rows
- `supabase/functions/crawl-website/index.ts`
- `src/components/admin/WebSourceCard.tsx`

**Modified**
- `src/pages/AdminKnowledge.tsx` — render WebSourceCard, source badge in list
- `supabase/functions/chat/index.ts` — include `source_url` in citations
- `src/components/ChatMessage.tsx` — render source as link when URL present
- `src/lib/chatApi.ts` — pass through `source_url` in meta

## Out of scope (can add later)
- Per-section crawl rules / exclude paths UI
- Live search fallback for breaking news
- PDF link extraction from web pages

## Confirmation needed before I build
I'll connect the **Firecrawl** connector during implementation — you'll get a one-click prompt to authorize it. Approve this plan and I'll proceed.