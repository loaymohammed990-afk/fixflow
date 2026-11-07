import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import YAML from "yaml";
import { readFileSync } from "node:fs";
import { config, sessionConfig } from "./config/env.js";
import { orders } from "./routes/order.routes.js";
import { dashboard } from "./routes/dashboard.routes.js";
import { authRoutes } from "./routes/auth.routes.js";
import { users } from "./routes/user.routes.js";
import { requireAuth, requireCsrf, requirePasswordChanged, requireRole, sessionMiddleware } from "./middleware/session.js";
import {
  ApiError,
  errorHandler,
  requireDatabase,
} from "./middleware/errorHandler.js";
import { success } from "./utils/orderDto.js";
export function createApp(settings = sessionConfig()) {
  const app = express();
  const apiOrigin = `http://${config.host === "::1" ? "[::1]" : config.host}:${config.port}`;
  const allowedOrigins = config.development ? [apiOrigin, ...config.origins] : config.origins;
  const csrf = requireCsrf(allowedOrigins);
  app.disable("x-powered-by");
  if (settings.secure) app.set("trust proxy", "loopback");
  app.use(
    cors({
      credentials: true,
      origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin))
          callback(null, true);
        else
          callback(
            new ApiError(403, "ORIGIN_NOT_ALLOWED", "مصدر الطلب غير مسموح"),
          );
      },
    }),
  );
  app.use("/api/v1", (req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });
  function requireJson(req, res, next) {
    if (["POST", "PATCH", "PUT"].includes(req.method) && !req.is("application/json"))
      return next(
        new ApiError(415, "VALIDATION_ERROR", "استخدم application/json"),
      );
    next();
  }
  const json = [requireJson, express.json({ limit: "100kb" })];
  app.get("/api/v1/health", requireDatabase, (req, res) =>
    success(res, { service: "FixFlow API", database: "connected" }),
  );
  const sessions = [requireDatabase, sessionMiddleware(settings)];
  const protectedApi = [...sessions, requireAuth, requirePasswordChanged, csrf];
  app.use("/api/v1/auth", ...sessions, ...json, authRoutes(csrf));
  app.use("/api/v1/orders", ...protectedApi, ...json, orders);
  app.use("/api/v1/dashboard", ...protectedApi, dashboard);
  app.use("/api/v1/users", ...protectedApi, requireRole("admin"), ...json, users);
  if (config.development) {
    const document = YAML.parse(
      readFileSync(new URL("../docs/openapi.yaml", import.meta.url), "utf8"),
    );
    app.get("/api-docs/openapi.yaml", (req, res) =>
      res
        .type("application/yaml")
        .send(
          readFileSync(
            new URL("../docs/openapi.yaml", import.meta.url),
            "utf8",
          ),
        ),
    );
    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(document));
  }
  app.use((req, res, next) =>
    next(new ApiError(404, "NOT_FOUND", "المسار غير موجود")),
  );
  app.use(errorHandler);
  return app;
}
