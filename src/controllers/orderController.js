import * as orderService from "../services/orderService.js";
import logger from "../config/logger.js";

export const createOrder = async (req, res, next) => {
  try {
    const order = await orderService.createOrder(req.user.sub, req.body);
    res.status(201).json(order);
  } catch (err) {
    logger.error(`createOrder failed: ${err.message}`);
    next(err);
  }
};

export const getOrderById = async (req, res, next) => {
  try {
    const order = await orderService.getOrderById(req.user.sub, req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    res.json(order);
  } catch (err) {
    logger.error(`getOrderById failed: ${err.message}`);
    next(err);
  }
};

export const listOrders = async (req, res, next) => {
  try {
    const orders = await orderService.listOrders(req.user.sub);
    res.json(orders);
  } catch (err) {
    logger.error(`listOrders failed: ${err.message}`);
    next(err);
  }
};
