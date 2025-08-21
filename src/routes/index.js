import { Router } from "express";
import authRoutes from "./authRoutes.js";
// import userRoutes from "./userRoutes.js";
// import tenantRoutes from "./tenantRoutes.js";
// import dashboardRoutes from "./dashboardRoutes.js";

const router = Router();

router.use("/auth", authRoutes);
// router.use("/users", userRoutes);
// router.use("/tenants", tenantRoutes);
// router.use("/dashboard", dashboardRoutes);

export default router;
