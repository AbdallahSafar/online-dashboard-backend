import { supabase } from "../config/supabase.js";
import logger from "../utils/logger.js";
import { getProfileByUserId } from "./profileService.js";
import { getCustomerById } from "./customerService.js";
import { getItemById } from "./itemService.js";

export async function createOrder(userId, orderData) {
  logger.info(`Starting order creation (user=${userId})`);

  const profile = await getProfileByUserId(userId);
  const tenantId = profile.tenant_id;
  logger.debug(`Resolved tenant (tenant=${tenantId}, user=${userId})`);

  // 🔹 Validate customer
  const customer = await getCustomerById(tenantId, orderData.customer_id);
  if (!customer) {
    const error = new Error(`Invalid customer: ${orderData.customer_id}`);
    error.status = 400;
    logger.warn(
      `Invalid customer (tenant=${tenantId}, user=${userId}, customer=${orderData.customer_id})`
    );
    throw error;
  }

  // 🔹 Validate order_items
  if (
    !Array.isArray(orderData.order_items) ||
    orderData.order_items.length === 0
  ) {
    const error = new Error("Order must contain at least one order_item");
    error.status = 400;
    logger.warn(
      `Order without items attempted (tenant=${tenantId}, user=${userId})`
    );
    throw error;
  }

  // 🔹 Insert order header
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      tenant_id: tenantId,
      customer_id: orderData.customer_id,
      total_amount_cents: 0,
      currency: orderData.currency || "USD",
      status: orderData.status || "pending",
    })
    .select("*")
    .single();

  if (orderError) {
    const error = new Error(`Order creation failed: ${orderError.message}`);
    error.status = 500;
    logger.error(
      `Order creation failed (tenant=${tenantId}, user=${userId}): ${orderError.message}`
    );
    throw error;
  }
  logger.info(`Order record created (id=${order.id}, tenant=${tenantId})`);

  let totalAmountCents = 0;
  const orderItems = [];

  try {
    for (const item of orderData.order_items) {
      logger.debug(
        `Validating order_item (item=${item.item_id}, qty=${item.quantity}, order=${order.id})`
      );

      const foundItem = await getItemById(tenantId, item.item_id);
      if (!foundItem) {
        const error = new Error(`Invalid item: ${item.item_id}`);
        error.status = 400;
        logger.warn(
          `Invalid item (tenant=${tenantId}, order=${order.id}, item=${item.item_id})`
        );
        throw error;
      }

      if (item.quantity <= 0) {
        const error = new Error(`Invalid quantity for item ${item.item_id}`);
        error.status = 400;
        logger.warn(
          `Invalid quantity (tenant=${tenantId}, order=${order.id}, item=${item.item_id}, qty=${item.quantity})`
        );
        throw error;
      }

      const unitPrice = foundItem.price_cents;
      const totalPrice = unitPrice * item.quantity;

      totalAmountCents += totalPrice;

      orderItems.push({
        order_id: order.id,
        item_id: item.item_id,
        quantity: item.quantity,
        unit_price_cents: unitPrice,
        total_price_cents: totalPrice,
        lot_id: item.lot_id || null,
      });

      logger.debug(
        `order_item validated (item=${item.item_id}, qty=${item.quantity}, unit=${unitPrice}, total=${totalPrice})`
      );
    }

    // 🔹 Insert order_items
    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems);
    if (itemsError) {
      const error = new Error(
        `order_items insertion failed: ${itemsError.message}`
      );
      error.status = 500;
      logger.error(
        `order_items insertion failed (order=${order.id}): ${itemsError.message}`
      );
      throw error;
    }
    logger.info(
      `order_items inserted (order=${order.id}, count=${orderItems.length})`
    );

    // 🔹 Update order total
    const { error: updateError } = await supabase
      .from("orders")
      .update({ total_amount_cents: totalAmountCents })
      .eq("id", order.id);

    if (updateError) {
      const error = new Error(
        `Failed to update order total: ${updateError.message}`
      );
      error.status = 500;
      logger.error(
        `Order total update failed (order=${order.id}): ${updateError.message}`
      );
      throw error;
    }
    logger.info(
      `Order total updated (order=${order.id}, total=${totalAmountCents})`
    );

    return {
      ...order,
      total_amount_cents: totalAmountCents,
      order_items: orderItems,
    };
  } catch (err) {
    // 🔹 Rollback order if item validation or insert failed
    await supabase.from("orders").delete().eq("id", order.id);
    logger.error(
      `Order creation rolled back (order=${order.id}, tenant=${tenantId}): ${err.message}`
    );
    throw err;
  }
}
