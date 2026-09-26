// Bill definitions are loaded from normalized Supabase tables by cloud-bootstrap.js.
// The legacy numeric id is retained in the UI so existing page logic and migrated occurrences remain compatible.
const rows = window.CloudSync?.baseBills || [];
