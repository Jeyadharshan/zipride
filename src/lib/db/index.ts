// src/lib/db/index.ts
// ZipRide MySQL API Client
// All queries go to the Express backend at /api/query → MySQL (via queryRepository.js)
// MongoDB is used on the backend side for audit logs, ride tracking, and notifications.
// This file intentionally has NO Supabase dependency.

export { apiClient as db, apiClient as supabase } from '../supabase/index';
