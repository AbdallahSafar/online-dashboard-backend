import { supabase } from "../config/supabase.js";
import logger from "../utils/logger.js";

/**
 * Get an item by ID (scoped to tenant).
 */
export async function getItemById(tenantId, itemId) {
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("id", itemId)
    .single();

  if (error) {
    logger.error(
      `Item lookup failed (tenant=${tenantId}, id=${itemId}): ${error.message}`
    );
    throw new Error(`Item lookup failed: ${error.message}`);
  }
  return data;
}

/**
 * Get an item by SKU (scoped to tenant).
 */
export async function getItemBySku(tenantId, sku) {
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("sku", sku)
    .single();

  if (error) {
    logger.error(
      `Item lookup by SKU failed (tenant=${tenantId}, sku=${sku}): ${error.message}`
    );
    throw new Error(`Item lookup by SKU failed: ${error.message}`);
  }
  return data;
}

/**
 * List all items for a tenant.
 */
export async function listItems(tenantId) {
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) {
    logger.error(`Items list failed (tenant=${tenantId}): ${error.message}`);
    throw new Error(`Items list failed: ${error.message}`);
  }
  return data;
}
