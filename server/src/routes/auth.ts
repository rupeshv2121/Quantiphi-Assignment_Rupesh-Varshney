import { Router } from "express";
import { User, hashPassword, verifyPassword, createAuthToken } from "../models/user.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/register", async (request, response) => {
  try {
    const { username, password } = request.body || {};
    if (!username || typeof username !== "string" || username.trim().length < 3) {
      response.status(400).json({ error: "Username must be at least 3 characters long." });
      return;
    }
    if (!password || typeof password !== "string" || password.length < 4) {
      response.status(400).json({ error: "Password must be at least 4 characters long." });
      return;
    }

    const cleanUsername = username.trim().toLowerCase();
    const existing = await User.findOne({ username: cleanUsername });
    if (existing) {
      response.status(409).json({ error: "That username is already taken. Please choose another." });
      return;
    }

    const { salt, hash } = hashPassword(password);
    const user = await User.create({ username: cleanUsername, salt, passwordHash: hash });
    const token = createAuthToken(user.id, user.username);

    response.status(201).json({
      token,
      user: { id: user.id, username: user.username },
    });
  } catch (err) {
    console.error("Register error:", err);
    response.status(500).json({ error: "Could not create account." });
  }
});

router.post("/login", async (request, response) => {
  try {
    const { username, password } = request.body || {};
    if (!username || !password) {
      response.status(400).json({ error: "Username and password are required." });
      return;
    }

    const cleanUsername = String(username).trim().toLowerCase();
    const user = await User.findOne({ username: cleanUsername });
    if (!user) {
      response.status(401).json({ error: "Invalid username or password." });
      return;
    }

    const valid = verifyPassword(String(password), user.salt, user.passwordHash);
    if (!valid) {
      response.status(401).json({ error: "Invalid username or password." });
      return;
    }

    const token = createAuthToken(user.id, user.username);
    response.json({
      token,
      user: { id: user.id, username: user.username },
    });
  } catch (err) {
    console.error("Login error:", err);
    response.status(500).json({ error: "Could not sign in." });
  }
});

router.get("/me", requireAuth, (request, response) => {
  response.json({ user: request.user });
});

export { router as authRouter };
