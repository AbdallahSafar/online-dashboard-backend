import supabase from "../config/supabase.js";
import logger from "../utils/logger.js";

/**
 * Check if a user already exists in Supabase by email.
 * Uses the Admin API (requires Service Role key).
 */
export async function checkUserExists(email) {
  try {
    const { data, error } = await supabase.auth.admin.getUserByEmail(email);
    if (error) {
      logger.error(`checkUserExists error: ${error.message}`);
      throw new Error("Error checking user existence");
    }
    return !!data?.user;
  } catch (err) {
    throw err;
  }
}
