#!/usr/bin/env bash
# Pull a fresh random 50-row sample of WP-era published rows.
# Usage: qa-pull-sample.sh /path/to/output.json [exclude-ids-file]
set -euo pipefail

OUT="$1"
EXCLUDE_FILE="${2:-}"

EXCLUDE_FILTER=""
if [[ -n "$EXCLUDE_FILE" && -f "$EXCLUDE_FILE" ]]; then
  ids=$(tr '\n' ',' < "$EXCLUDE_FILE" | sed 's/,$//')
  if [[ -n "$ids" ]]; then
    EXCLUDE_FILTER="AND legacy_article_id NOT IN ($ids)"
  fi
fi

PGPASSWORD=poly1885 psql -h 127.0.0.1 -p 5433 -U poly -d polymer2 -tA -c "
WITH samp AS (
  SELECT id, legacy_article_id, slug, plain_title, subdeck, section, kicker, legacy_html_url
  FROM articles
  WHERE legacy_source='wordpress' AND _status='published'
  $EXCLUDE_FILTER
  ORDER BY random()
  LIMIT 50
)
SELECT json_agg(row_to_json(s)) FROM samp s;
" > "$OUT"

echo "wrote $(wc -c < "$OUT") bytes to $OUT"
