import { Express, Request, Response, NextFunction } from "express";
import passport from "passport";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import { config } from "@/config";
import logger from "@/lib/logger";
import { findById } from "@/repositories/user.repository";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "@/lib/better-auth";
import { AuthRequest } from "@/types/handlers";
import {
  doesMemberHaveRole,
  isMemberOfOrganization,
} from "@/services/organization.service";
import { OrganizationRole } from "@shared/types/src/organization";
import * as externalApiKeyService from "@/services/externalApiKey.service";
import { ExternalApiScope } from "@shared/types/src";

export const withAuth = passport.authenticate("jwt", { session: false });

export function initializeAuth(app: Express) {
  app.use(passport.initialize());

  passport.use(
    new JwtStrategy(
      {
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        secretOrKey: config.jwt.secret,
      },
      async (payload, done) => {
        try {
          const user = await findById(payload.id);
          if (!user) {
            return done(null, false);
          }
          return done(null, user);
        } catch (error) {
          return done(error, false);
        }
      },
    ),
  );

  return passport;
}

export const withApiKeyAuth = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const apiKey = req.headers.authorization;
  if (!apiKey || apiKey !== config.webhookApiKey) {
    logger.error("Unauthorized request");
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};

export const withBetterAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const sessionResult = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (!sessionResult) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // attach to req so handlers can use it
  // sessionResult has { user, session } structure - attach the inner session object
  (req as any).user = sessionResult.user;
  (req as any).session = sessionResult.session;

  next();
};

export const validateMemberOfOrganization = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authReq = req as AuthRequest<{ organizationId: string }>;
  const { organizationId } = req.validated;
  const isMember = await isMemberOfOrganization(
    authReq.user.id,
    organizationId,
  );
  if (!isMember) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};

export const validateMemberOfOrganizationIs =
  (roles: OrganizationRole[]) =>
  async (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest<{ organizationId: string }>;
    const { organizationId } = req.validated;
    const hasRole = await doesMemberHaveRole(
      authReq.user.id,
      organizationId,
      roles,
    );
    if (!hasRole) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    next();
  };

// ============================================
// External API Key Authentication
// ============================================

export interface ExternalApiRequest extends Request {
  externalAuth: {
    organizationId: string;
    scopes: ExternalApiScope[];
    keyId: string;
  };
}

/**
 * Middleware to authenticate requests using an external API key.
 * Expects the API key in the X-API-Key header.
 */
export const withExternalApiKey = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const apiKey = req.headers["x-api-key"] as string | undefined;

  if (!apiKey) {
    logger.warn({ path: req.path }, "External API request missing X-API-Key header");
    return res.status(401).json({ error: "Missing API key" });
  }

  const authResult = await externalApiKeyService.validateApiKey(apiKey);

  if (!authResult) {
    return res.status(401).json({ error: "Invalid or expired API key" });
  }

  // Attach auth info to request
  (req as ExternalApiRequest).externalAuth = authResult;

  next();
};

/**
 * Middleware factory to require specific scopes for an external API endpoint.
 * Use after withExternalApiKey middleware.
 */
export const requireScope = (requiredScope: ExternalApiScope) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const externalReq = req as ExternalApiRequest;

    if (!externalReq.externalAuth) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!externalApiKeyService.hasScope(externalReq.externalAuth.scopes, requiredScope)) {
      logger.warn(
        {
          keyId: externalReq.externalAuth.keyId,
          requiredScope,
          hasScopes: externalReq.externalAuth.scopes,
        },
        "External API request lacks required scope"
      );
      return res.status(403).json({
        error: `Missing required scope: ${requiredScope}`,
      });
    }

    next();
  };
};
