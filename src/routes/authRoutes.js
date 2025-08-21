import { Router } from "express";
import { login, signup, getProfile } from "../controllers/authController.js";
import { authMiddleware } from "../middlewares/auth.js";

const router = Router();

router.post("/signup", signup);
router.post("/login", login);
router.get("/me", authMiddleware, getProfile);

export default router;
