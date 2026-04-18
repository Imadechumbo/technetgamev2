import express from "express";
import helmet from "helmet";
import compression from "compression";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import healthRoutes from "./routes/healthRoutes.js";
import newsRoutes from "./routes/newsRoutes.js";
import metaRoutes from "./routes/metaRoutes.js";
import mediaRoutes from "./routes/mediaRoutes.js";
import hardwareRoutes from "./routes/hardwareRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import editorialRoutes from "./routes/editorialRoutes.js";
import hermesRoutes from "./routes/hermesRoutes.js";
import hermesV2Routes from "./routes/hermesV2Routes.js";

import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

const app = express();


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const candidateSiteDirs = [
  process.env.PUBLIC_SITE_DIR ? path.resolve(process.env.PUBLIC_SITE_DIR) : null,
  path.resolve(projectRoot, '..', 'site'),
  path.resolve(projectRoot, '..', '..', 'site'),
  path.resolve(projectRoot, 'site')
].filter(Boolean);
const publicSiteDir = candidateSiteDirs.find((dir) => fs.existsSync(path.join(dir, 'index.html')));


app.disable("x-powered-by");
app.set("etag", "strong");
app.set("trust proxy", 1);

const envOrigins = String(process.env.ALLOWED_ORIGINS || process.env.CORS_ORIGIN || "")
  .split(",")
  .map(value => value.trim())
  .filter(Boolean);

const allowedOrigins = new Set([
  "https://technetgame.com.br",
  "https://www.technetgame.com.br",
  "https://technetgame-site.pages.dev",
  "https://technetgame-backend-production.up.railway.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  ...envOrigins
]);

app.use((req, res, next) => {
  const origin = String(req.headers.origin || "").trim();

  if (origin && allowedOrigins.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }

  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Refresh-Token, Accept"
  );
  res.setHeader("Access-Control-Max-Age", "86400");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: false,
  })
);

app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.get(["/", "/health"], (_req, res) => {
  res.status(200).json({
    ok: true,
    status: "ok",
    service: "technetgame-api",
    environment: process.env.NODE_ENV || "development",
    time: new Date().toISOString(),
    ai: {
      enabled: process.env.OPENCLAW_ENABLED !== "false",
      providersConfigured: [
        Boolean(process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY),
        Boolean(process.env.OPENROUTER_API_KEY),
        Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY),
        Boolean(process.env.DEEPSEEK_API_KEY),
        Boolean(process.env.VISION_API_KEY || process.env.OPENAI_VISION_API_KEY),
      ].filter(Boolean).length,
    },
  });
});

app.use("/api/health", healthRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/meta", metaRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api/hardware", hardwareRoutes);
app.use("/api/v1", aiRoutes);
app.use("/api/editorial", editorialRoutes);
app.use("/api/hermes", hermesRoutes);
app.use("/api/hermes-v2", hermesV2Routes);

if (publicSiteDir) {
  app.use(express.static(publicSiteDir, { extensions: ["html"], index: ["index.html"] }));

  app.get(["/technet-ai", "/technet-ai.html"], (_req, res) => {
    res.sendFile(path.join(publicSiteDir, "technet-ai.html"));
  });

  app.get("/admin-ui", (_req, res) => {
    res.redirect(302, "/technet-ai?panel=openclaw");
  });

  app.get("/site", (_req, res) => {
    res.redirect(302, "/");
  });
}

app.use(notFoundHandler);
app.use(errorHandler);

export default app;