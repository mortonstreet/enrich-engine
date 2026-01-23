/**
 * Standardized API error codes for enterprise-grade error handling.
 */
export const ErrorCodes = {
  // Authentication errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_API_KEY: 'INVALID_API_KEY',
  EXPIRED_API_KEY: 'EXPIRED_API_KEY',
  INSUFFICIENT_SCOPE: 'INSUFFICIENT_SCOPE',

  // Authorization errors
  FORBIDDEN: 'FORBIDDEN',
  NO_ACTIVE_ORGANIZATION: 'NO_ACTIVE_ORGANIZATION',

  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_REQUEST: 'INVALID_REQUEST',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_CSV_FORMAT: 'INVALID_CSV_FORMAT',

  // Resource errors
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',

  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // Credit errors
  INSUFFICIENT_CREDITS: 'INSUFFICIENT_CREDITS',

  // Server errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

export interface ApiErrorResponse {
  error: string;
  code: ErrorCode;
  details?: Record<string, unknown>;
  requestId?: string;
}

/**
 * Creates a standardized error response object.
 */
export function createErrorResponse(
  message: string,
  code: ErrorCode,
  details?: Record<string, unknown>,
  requestId?: string
): ApiErrorResponse {
  return {
    error: message,
    code,
    ...(details && { details }),
    ...(requestId && { requestId }),
  };
}

/**
 * API Error class for throwing standardized errors.
 */
export class ApiError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: ErrorCode,
    statusCode: number = 400,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }

  toResponse(requestId?: string): ApiErrorResponse {
    return createErrorResponse(this.message, this.code, this.details, requestId);
  }
}
