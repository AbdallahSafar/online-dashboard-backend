import supabase from "../config/supabase.js";
import logger from "../utils/logger.js";

/**
 * Ensure a role exists by name. Returns role ID if found.
 */
export async function getRoleIdByName(roleName) {
  try {
    const { data, error } = await supabase
      .from("roles")
      .select("id")
      .eq("name", roleName)
      .single();

    if (error) {
      logger.error(`Role lookup failed for "${roleName}": ${error.message}`);
      throw new Error(`Role "${roleName}" not found`);
    }

    return data.id;
  } catch (err) {
    throw err;
  }
}
