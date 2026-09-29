import { createClient, type SupabaseClient } from'@supabase/supabase-js';

/**
 * 🦅 Falcon ERP - Server-side Supabase Admin Client
 * Single source of truth for the service-role client used by API routes
 * (auth provisioning, registration). NEVER import this module from the client bundle.
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ||'https://swsmmnuisefafzofezus.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY =
 process.env.SUPABASE_SERVICE_ROLE_KEY ||
'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN3c21tbnVpc2VmYWZ6b2ZlenVzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODgyODE4NCwiZXhwIjoyMTA0NDA0MTg0fQ._lFOC1AQUPuu7O3m96_ltI-RQ-inqHlKc86Ew-vWOos';

export const createAdminClient = (): SupabaseClient =>
 createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
 auth: {
 autoRefreshToken: false,
 persistSession: false,
 },
 });