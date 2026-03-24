import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const { data, error } = await supabase.auth.admin.createUser({
    email: "test@test.com",
    password: "password123",
    email_confirm: true,
  });

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log("User created:", data.user);
}

main();