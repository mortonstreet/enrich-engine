import { DBUser, DBSession } from "@shared/db/src/types";
import { Request, Response, NextFunction } from "express";
import { ExternalApiScope } from "@shared/types/src";

export interface ValidatedRequest<T> extends Request {
  validated: T;
}

// Extend Express's Request type properly
export interface AuthRequest<T> extends ValidatedRequest<T> {
  user: DBUser;
  session: DBSession;
}

// External API key authenticated request
export interface ExternalApiAuthRequest<T> extends ValidatedRequest<T> {
  externalAuth: {
    organizationId: string;
    scopes: ExternalApiScope[];
    keyId: string;
  };
}

export type ValidatedRequestHandler<T> = (
  req: ValidatedRequest<T>,
  res: Response,
  next: NextFunction,
) => Promise<any>;

// RequestHandler that ensures user exists in the handler
export type AuthRequestHandler<T> = (
  req: AuthRequest<T>,
  res: Response,
  next: NextFunction,
) => Promise<any>;

// RequestHandler for external API key authenticated requests
export type ExternalApiRequestHandler<T> = (
  req: ExternalApiAuthRequest<T>,
  res: Response,
  next: NextFunction,
) => Promise<any>;
