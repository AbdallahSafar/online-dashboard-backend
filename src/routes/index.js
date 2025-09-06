import { Router } from "express";
import authRoutes from "./authRoutes.js";
import orderRoutes from "./orderRoutes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/orders", orderRoutes);

export default router;
