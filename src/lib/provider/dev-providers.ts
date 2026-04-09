export const DEV_PROVIDER_OPTIONS = [
  {
    key: "provider-1",
    label: "Dev Provider 1",
    email: "provider-demo-1@inklink.local",
  },
  {
    key: "provider-2",
    label: "Dev Provider 2",
    email: "provider-demo-2@inklink.local",
  },
] as const;

export type DevProviderKey = (typeof DEV_PROVIDER_OPTIONS)[number]["key"];

export function getDefaultDevProviderKey(): DevProviderKey {
  return DEV_PROVIDER_OPTIONS[0].key;
}

export function resolveDevProviderKey(
  value: string | undefined,
): DevProviderKey {
  const matchedOption = DEV_PROVIDER_OPTIONS.find(
    (option) => option.key === value,
  );

  return matchedOption?.key ?? getDefaultDevProviderKey();
}

export function getDevProviderEmail(devProviderKey: DevProviderKey) {
  return (
    DEV_PROVIDER_OPTIONS.find((option) => option.key === devProviderKey)?.email ??
    DEV_PROVIDER_OPTIONS[0].email
  );
}

export function getDevProviderLabel(devProviderKey: DevProviderKey) {
  return (
    DEV_PROVIDER_OPTIONS.find((option) => option.key === devProviderKey)?.label ??
    DEV_PROVIDER_OPTIONS[0].label
  );
}
