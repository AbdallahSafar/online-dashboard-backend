import { supabase } from "../config/supabase.js";
import logger from "../utils/logger.js";

/**
 * Internal helper: fetch a user's profile with tenant_id.
 */
export async function getProfileByUserId(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, tenant_id, first_name, last_name, primary_phone_e164, status")
    .eq("id", userId)
    .single();

  if (error) {
    logger.error(`Profile lookup failed (userId=${userId}): ${error.message}`);
    throw new Error(`Profile lookup failed: ${error.message}`);
  }

  return data;
}

export async function getProfilesByTenant(tenantId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("tenant_id", tenantId);

  if (error) {
    logger.error(
      `Profiles lookup failed (tenant=${tenantId}): ${error.message}`
    );
    throw new Error(`Profiles lookup failed: ${error.message}`);
  }

  return data;
}
