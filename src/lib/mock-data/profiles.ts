import type { MerchantProfile, Profile } from "@/types";

// Mock MVP seed data only. Replace with Supabase-backed profiles later.
export const mockProfiles = [
  {
    id: "profile-merchant-coastline",
    role: "merchant",
    displayName: "Maya Chen",
    email: "maya@coastlinegoods.example",
    createdAt: "2026-03-10T16:20:00.000Z",
  },
  {
    id: "profile-merchant-canyon",
    role: "merchant",
    displayName: "Jon Rivera",
    email: "jon@canyonclub.example",
    createdAt: "2026-03-18T18:05:00.000Z",
  },
  {
    id: "profile-provider-echo-park",
    role: "provider",
    displayName: "Echo Park Print Works",
    email: "ops@echoparkprintworks.example",
    createdAt: "2026-02-14T19:40:00.000Z",
  },
  {
    id: "profile-provider-long-beach",
    role: "provider",
    displayName: "Harbor Stitch & Print",
    email: "hello@harborstitchprint.example",
    createdAt: "2026-02-20T17:35:00.000Z",
  },
  {
    id: "profile-provider-santa-ana",
    role: "provider",
    displayName: "Civic Center Ink",
    email: "jobs@civiccenterink.example",
    createdAt: "2026-02-28T21:15:00.000Z",
  },
  {
    id: "profile-provider-san-diego",
    role: "provider",
    displayName: "Barrio Logan Press",
    email: "studio@barriologanpress.example",
    createdAt: "2026-03-01T16:50:00.000Z",
  },
  {
    id: "profile-provider-riverside",
    role: "provider",
    displayName: "Inland Blank Lab",
    email: "production@inlandblanklab.example",
    createdAt: "2026-03-06T20:45:00.000Z",
  },
  {
    id: "profile-admin-ops",
    role: "admin",
    displayName: "PrintPair Ops",
    email: "ops@print-pair.com",
    createdAt: "2026-02-01T18:00:00.000Z",
  },
] satisfies Profile[];

export const mockMerchants = [
  {
    id: "merchant-coastline-goods",
    profileId: "profile-merchant-coastline",
    businessName: "Coastline Goods",
    city: "Santa Monica",
    state: "CA",
    zip: "90401",
    fulfillmentGoal: "local_first",
    preferredBlankBrands: ["Los Angeles Apparel", "AS Colour"],
  },
  {
    id: "merchant-canyon-club",
    profileId: "profile-merchant-canyon",
    businessName: "Canyon Club Supply",
    city: "Pasadena",
    state: "CA",
    zip: "91103",
    fulfillmentGoal: "premium_blank",
    preferredBlankBrands: ["Everybody.World", "Bella+Canvas"],
  },
] satisfies MerchantProfile[];
