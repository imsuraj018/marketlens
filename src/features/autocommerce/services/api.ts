
import { db } from "../../../lib";

/**
 * Register a new customer.
 * The database trigger creates their customer profile.
 */
export async function signUp(
  name: string,
  email: string,
  password: string
) {
  const { data, error } = await db.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: {
        full_name: name.trim(),
      },
    },
  });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Sign in using email and password.
 */
export async function signIn(
  email: string,
  password: string
) {
  const { data, error } =
    await db.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Verify that the authenticated account has
 * an active customer profile.
 *
 * Do not update the role from the frontend.
 */
export async function activateCustomer() {
  const {
    data: { user },
    error: authError,
  } = await db.auth.getUser();

  if (authError) {
    throw authError;
  }

  if (!user) {
    throw new Error("Please sign in first.");
  }

  const { data: profile, error } = await db
    .from("profiles")
    .select("id, role, is_active")
    .eq("id", user.id)
    .single();

  if (error) {
    throw error;
  }

  if (!profile.is_active) {
    throw new Error("Your account is inactive.");
  }

  return profile;
}
