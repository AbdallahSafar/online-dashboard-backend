import { Router } from "express";
import {
  createOrder,
  getOrderById,
  listOrders,
} from "../controllers/orderController.js";
import { authMiddleware } from "../middlewares/auth.js";

const router = Router();

// All routes under /api/orders
router.post("/", authMiddleware, createOrder);
router.get("/:id", authMiddleware, getOrderById);
router.get("/", authMiddleware, listOrders);

export default router;
