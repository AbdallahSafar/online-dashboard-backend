import supabase from "../config/supabase.js";
import logger from "../utils/logger.js";
import { createUser } from "../services/userService.js";
// import { getRoleIdByName } from "../services/roleService.js";

export const signup = async (req, res, next) => {
  try {
    const { email, password, company_name } = req.body;

    // Basic validations
    if (!email || !password || !company_name) {
      return res
        .status(400)
        .json({ error: "Email, password, and company name are required" });
    }

    // 🔹 Delegate all business logic to service
    const result = await createUser(req.body);

    // Service returns: { user, tenant, roles, tokens }
    res.status(201).json({
      message: "Signup successful",
      tenant_id: result.tenant.id,
      user: result.user,
      roles: result.roles,
      access_token: result.tokens?.access_token || null,
      refresh_token: result.tokens?.refresh_token || null,
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
