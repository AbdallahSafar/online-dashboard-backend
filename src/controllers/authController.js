import supabase from "../config/supabase.js";
import logger from "../utils/logger.js";
import { DEFAULT_ROLES } from "../config/roles.js";
import { checkUserExists } from "../services/userService.js";
import { getRoleIdByName } from "../services/roleService.js";

export const signup = async (req, res, next) => {
  try {
    const { email, password, first_name, last_name, phone, company_name } =
      req.body;

    if (!email || !password || !company_name) {
      return res
        .status(400)
        .json({ error: "Email, password, and company name are required" });
    }

    // 🔹 Check if user already exists
    const exists = await checkUserExists(email);
    if (exists) {
      return res.status(400).json({ error: "Email already registered" });
    }

    // 🔹 Create Auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });
    if (authError) {
      logger.error(`Signup failed for ${email}: ${authError.message}`);
      return res.status(400).json({ error: authError.message });
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
      await supabase.auth.admin.deleteUser(user.id);
      return res
        .status(500)
        .json({ error: "Signup rolled back due to tenant creation failure" });
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
      await supabase.from("tenants").delete().eq("id", tenant.id);
      await supabase.auth.admin.deleteUser(user.id);
      return res
        .status(500)
        .json({ error: "Signup rolled back due to profile creation failure" });
    }

    // 🔹 Get Role ID from config
    const adminRoleId = await getRoleIdByName(DEFAULT_ROLES.TENANT_ADMIN);

    // 🔹 Assign role
    const { error: assignRoleError } = await supabase
      .from("profile_roles")
      .insert({ profile_id: user.id, role_id: adminRoleId });

    if (assignRoleError) {
      await supabase.from("profiles").delete().eq("id", user.id);
      await supabase.from("tenants").delete().eq("id", tenant.id);
      await supabase.auth.admin.deleteUser(user.id);
      return res
        .status(500)
        .json({ error: "Signup rolled back due to role assignment failure" });
    }

    res.status(201).json({
      message: "Signup successful",
      tenant_id: tenant.id,
      user,
      roles: [DEFAULT_ROLES.TENANT_ADMIN],
      access_token: authData.session ? authData.session.access_token : null,
      refresh_token: authData.session ? authData.session.refresh_token : null,
    });
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // 1. Authenticate with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      logger.error(`Login failed for ${email}: ${error.message}`);
      return res.status(401).json({ error: error.message });
    }

    logger.info(`User logged in: ${email}`);

    // 2. Return session (contains access + refresh tokens)
    res.json({
      message: "Login successful",
      user: data.user,
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in: data.session.expires_in,
      token_type: data.session.token_type,
    });
  } catch (err) {
    next(err);
  }
};

export const getProfile = async (req, res, next) => {
  try {
    const userId = req.user.sub; // from JWT payload (authMiddleware)

    // 1. Fetch profile with tenant & roles
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select(
        `
        id,
        first_name,
        last_name,
        primary_phone_e164,
        avatar_url,
        status,
        tenant:tenants (
          id,
          slug,
          region_code,
          plan:plans (
            id,
            price_cents,
            currency,
            interval,
            features
          ),
          subscriptions (
            id,
            status,
            current_period_start,
            current_period_end
          )
        ),
        roles:profile_roles (
          role:roles (
            id,
            name,
            description
          )
        )
      `
      )
      .eq("id", userId)
      .single();

    if (profileError) {
      logger.error(
        `Profile fetch failed for ${userId}: ${profileError.message}`
      );
      return res.status(404).json({ error: "Profile not found" });
    }

    res.json({
      user_id: userId,
      profile,
    });
  } catch (err) {
    next(err);
  }
};
