// services/userService.js
import { supabase } from "../config/supabaseClient.js";
import { DEFAULT_ROLES } from "../config/roles.js";
import { getRoleIdByName } from "./roleService.js";
import logger from "../utils/logger.js";

export const createUser = async ({
  email,
  password,
  company_name,
  first_name,
  last_name,
  phone,
}) => {
  // 🔹 Check if user already exists
  const { data: existingUser, error: existsError } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existsError) {
    logger.error(
      `Error checking existing user for ${email}: ${existsError.message}`
    );
    const error = new Error("Failed to verify if user exists");
    error.status = 500;
    throw error;
  }

  if (existingUser) {
    logger.warn(`Signup attempt with already registered email: ${email}`);
    const error = new Error("Email already registered");
    error.status = 400;
    throw error;
  }

  // 🔹 Create Auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });
  if (authError) {
    logger.error(`Signup failed for ${email}: ${authError.message}`);
    const error = new Error(authError.message);
    error.status = 400;
    throw error;
  }
  const user = authData.user;

  // 🔹 Create Tenant
  const slug = company_name.toLowerCase().replace(/\s+/g, "-");
  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .insert({
      name: company_name,
      slug,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .select("id")
    .single();

  if (tenantError) {
    logger.error(
      `Tenant creation failed for user ${email}: ${tenantError.message}`
    );
    await supabase.auth.admin.deleteUser(user.id);
    const error = new Error(
      "Signup rolled back due to tenant creation failure"
    );
    error.status = 500;
    throw error;
  }

  // 🔹 Create Profile
  const { error: profileError } = await supabase.from("profiles").insert({
    id: user.id,
    tenant_id: tenant.id,
    first_name,
    last_name,
    primary_phone_e164: phone,
    status: "active",
    created_at: new Date(),
    updated_at: new Date(),
  });

  if (profileError) {
    logger.error(
      `Profile creation failed for user ${email}: ${profileError.message}`
    );
    await supabase.from("tenants").delete().eq("id", tenant.id);
    await supabase.auth.admin.deleteUser(user.id);
    const error = new Error(
      "Signup rolled back due to profile creation failure"
    );
    error.status = 500;
    throw error;
  }

  // 🔹 Get Role ID
  const adminRoleId = await getRoleIdByName(DEFAULT_ROLES.TENANT_ADMIN);

  // 🔹 Assign role
  const { error: assignRoleError } = await supabase
    .from("profile_roles")
    .insert({ profile_id: user.id, role_id: adminRoleId });

  if (assignRoleError) {
    logger.error(
      `Role assignment failed for user ${email}: ${assignRoleError.message}`
    );
    await supabase.from("profiles").delete().eq("id", user.id);
    await supabase.from("tenants").delete().eq("id", tenant.id);
    await supabase.auth.admin.deleteUser(user.id);
    const error = new Error(
      "Signup rolled back due to role assignment failure"
    );
    error.status = 500;
    throw error;
  }

  // ✅ Success
  return {
    user,
    tenant,
    roles: [DEFAULT_ROLES.TENANT_ADMIN],
    tokens: {
      access_token: authData.session?.access_token || null,
      refresh_token: authData.session?.refresh_token || null,
    },
  };
};
