-- Migration: Add needs_password_setup flag to profiles
-- This flag is set to true for magic-link first-time users,
-- forcing them through /set-password before they can use the app.
-- Password-signup users have it set to false immediately on signup.
-- Existing users default to false so they are not disrupted.

alter table public.profiles
  add column needs_password_setup boolean not null default false;
