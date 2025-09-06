import { supabase } from "../config/supabase.js";
import logger from "../utils/logger.js";

export async function getTenantById(tenantId) {
  const { data, error } = await supabase
    .from("tenants")
    .select("*")
    .eq("id", tenantId)
    .single();

  if (error) {
    logger.error(`Tenant lookup failed (id=${tenantId}): ${error.message}`);
    throw new Error(`Tenant lookup failed: ${error.message}`);
  }
  return data;
}

export async function getTenantBySlug(slug) {
  const { data, error } = await supabase
    .from("tenants")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) {
    logger.error(`Tenant lookup failed (slug=${slug}): ${error.message}`);
    throw new Error(`Tenant lookup failed: ${error.message}`);
  }
  return data;
}
