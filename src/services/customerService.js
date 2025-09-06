import { supabase } from "../config/supabase.js";
import logger from "../utils/logger.js";

/**
 * Get a customer by ID (scoped to tenant).
 */
export async function getCustomerById(tenantId, customerId) {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("id", customerId)
    .single();

  if (error) {
    logger.error(
      `Customer lookup failed (tenant=${tenantId}, id=${customerId}): ${error.message}`
    );
    throw new Error(`Customer lookup failed: ${error.message}`);
  }
  return data;
}

/**
 * List all customers for a tenant.
 */
export async function listCustomers(tenantId) {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) {
    logger.error(`Customer list failed (tenant=${tenantId}): ${error.message}`);
    throw new Error(`Customer list failed: ${error.message}`);
  }
  return data;
}
