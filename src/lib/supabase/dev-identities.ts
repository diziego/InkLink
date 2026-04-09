import { createSupabaseServiceRoleClient } from "./service-role";

export type DevelopmentIdentity = {
  profileId: string;
  email: string;
};

type EnsureDevelopmentIdentityOptions = {
  envKey: string;
  fallbackEmail: string;
  explicitEmail?: string;
};

export async function ensureDevelopmentAuthIdentity({
  envKey,
  fallbackEmail,
  explicitEmail,
}: EnsureDevelopmentIdentityOptions): Promise<DevelopmentIdentity> {
  const supabase = createSupabaseServiceRoleClient();
  const email = explicitEmail ?? process.env[envKey] ?? fallbackEmail;

  const { data: usersData, error: listUsersError } =
    await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });

  if (listUsersError) {
    throw new Error(listUsersError.message);
  }

  const existingUser = usersData.users.find((user) => user.email === email);

  if (existingUser) {
    return {
      profileId: existingUser.id,
      email,
    };
  }

  const { data: createdUserData, error: createUserError } =
    await supabase.auth.admin.createUser({
      email,
      password: `${crypto.randomUUID()}Aa1!`,
      email_confirm: true,
    });

  if (createUserError || !createdUserData.user) {
    throw new Error(
      createUserError?.message ?? "Failed to create development auth user.",
    );
  }

  return {
    profileId: createdUserData.user.id,
    email,
  };
}
