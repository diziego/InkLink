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
  const existingUser = await findAuthUserByEmail(email);

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

  if (createUserError) {
    const duplicateUser = await findAuthUserByEmail(email);

    if (duplicateUser) {
      return {
        profileId: duplicateUser.id,
        email,
      };
    }

    throw new Error(createUserError.message);
  }

  if (!createdUserData.user) {
    throw new Error(
      "Failed to create development auth user.",
    );
  }

  return {
    profileId: createdUserData.user.id,
    email,
  };

  async function findAuthUserByEmail(targetEmail: string) {
    const perPage = 200;

    for (let page = 1; page <= 10; page += 1) {
      const { data: usersData, error: listUsersError } =
        await supabase.auth.admin.listUsers({
          page,
          perPage,
        });

      if (listUsersError) {
        throw new Error(listUsersError.message);
      }

      const matchedUser = usersData.users.find(
        (user) => user.email === targetEmail,
      );

      if (matchedUser) {
        return matchedUser;
      }

      if (usersData.users.length < perPage) {
        break;
      }
    }

    return null;
  }
}
