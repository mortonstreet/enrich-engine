import { Request, Response, NextFunction } from "express";
import Sentry from "@/lib/sentry";
import logger from "@/lib/logger";
import { ZodError } from "zod";
import { StatusCodes } from "http-status-codes";
import { config } from "@/config";
import { ApiError, ErrorCodes, createErrorResponse, ErrorCode } from "@/lib/errors";

interface ErrorWithStatus extends Error {
  status?: number;
  statusCode?: number;
  code?: ErrorCode;
}

/**
 * Maps error types to standardized error codes.
 */
function getErrorCode(err: ErrorWithStatus, statusCode: number): ErrorCode {
  // Return the code if it's already an ApiError
  if (err instanceof ApiError || err.code) {
    return err.code as ErrorCode;
  }

  // Map Zod errors to validation error
  if (err instanceof ZodError) {
    return ErrorCodes.VALIDATION_ERROR;
  }

  // Map by status code
  switch (statusCode) {
    case 400:
      return ErrorCodes.INVALID_REQUEST;
    case 401:
      return ErrorCodes.UNAUTHORIZED;
    case 403:
      return ErrorCodes.FORBIDDEN;
    case 404:
      return ErrorCodes.RESOURCE_NOT_FOUND;
    case 429:
      return ErrorCodes.RATE_LIMIT_EXCEEDED;
    default:
      return ErrorCodes.INTERNAL_ERROR;
  }
}

export const errorHandler = (
  err: ErrorWithStatus,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Determine status code
  const statusCode =
    err.status ||
    err.statusCode ||
    (err instanceof ApiError
      ? err.statusCode
      : err instanceof ZodError
      ? StatusCodes.BAD_REQUEST
      : StatusCodes.INTERNAL_SERVER_ERROR);

  // Get standardized error code
  const errorCode = getErrorCode(err, statusCode);

  // Get request ID for tracking
  const requestId = req.headers["x-request-id"] as string | undefined;

  // Prepare error details for logging
  const errorDetails = {
    name: err.name,
    message: err.message,
    code: errorCode,
    stack: err.stack,
    status: statusCode,
    ...(err instanceof ZodError ? { validation: err.issues } : {}),
  };

  // Log error with request context
  logger.error(
    {
      err: errorDetails,
      req: {
        id: requestId,
        method: req.method,
        url: req.originalUrl || req.url,
        params: req.params,
        query: req.query,
        body: req.body,
        headers: {
          "user-agent": req.get("user-agent"),
          "x-request-id": req.get("x-request-id"),
          authorization: req.get("authorization") ? "[REDACTED]" : undefined,
        },
      },
    },
    `Request failed: ${err.message}`,
  );

  // Send to Sentry
  Sentry.captureException(err);

  // Build standardized error response
  const isValidationError = err instanceof ZodError;
  const isProd = config.nodeEnv === "production";

  const errorResponse = createErrorResponse(
    isValidationError ? "Validation failed" : err.message,
    errorCode,
    isValidationError
      ? { validation: err.issues }
      : err instanceof ApiError
      ? err.details
      : !isProd
      ? { stack: err.stack }
      : undefined,
    requestId
  );

  res.status(statusCode).json(errorResponse);
};
