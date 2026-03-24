import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  throw new Error("Missing Supabase environment variables");
}

const publicClient = createClient(supabaseUrl, anonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function main() {
  const email = "test@test.com";
  const password = "password123";

  const { data: signUpData, error: signUpError } = await publicClient.auth.signUp({
    email,
    password,
  });

  if (signUpError || !signUpData.user) {
    console.error("Error creating user with signUp:", signUpError);
    return;
  }

  const user = signUpData.user;

  const { error: profileError } = await adminClient.from("user_profile").upsert({
    user_id: user.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  if (profileError) {
    console.error("User created but profile creation failed:", profileError);
    return;
  }

  console.log("User created:", user);
  console.log("Profile created for user:", user.id);
}

main().catch((err) => {
  console.error("Unexpected error:", err);
});