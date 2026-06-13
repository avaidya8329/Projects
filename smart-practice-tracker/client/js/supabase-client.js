// ── Supabase Client Initialization ──────────────────────
const SUPABASE_URL = 'https://etnzdvxwlblideuddmrg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0bnpkdnh3bGJsaWRldWRkbXJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxMTA5ODIsImV4cCI6MjA4OTY4Njk4Mn0.2M6kQ64GC5rvXuZh89FYX3Fv2cAHTKUqilMcGVppxjU';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
