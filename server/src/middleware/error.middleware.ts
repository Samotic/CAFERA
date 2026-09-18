import { randomUUID } from 'node:crypto';
import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from 'express';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import type { ApiFailure, FieldError } from '@cafera/shared';
import { ApiError, isApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';
import { isProduction } from '../config/env.js';

/**
 * The single place an error becomes a response.
 *
 * Every framework-specific failure shape — zod, Mongoose validation, duplicate
 * key, cast error, body-parser, multer — is translated here into the one
 * envelope the client understands. Handlers never format errors themselves, so
 * there is no route that accidentally leaks a stack trace because it predates
 * the convention.
 */

/** 404 for anything that reached the end of the router without matching. */
export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(ApiError.notFound(`No route matches ${req.method} ${req.originalUrl}`));
};

function zodToFieldErrors(error: ZodError): FieldError[] {
  return error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
  }));
}

function mongooseToFieldErrors(error: mongoose.Error.ValidationError): FieldError[] {
  return Object.entries(error.errors).map(([path, detail]) => ({
    path,
    message: detail.message,
  }));
}

interface MongoServerError extends Error {
  code?: number;
  keyPattern?: Record<string, unknown>;
}

function normalise(error: unknown): ApiError {
  if (isApiError(error)) return error;

  if (error instanceof ZodError) {
    return ApiError.validation(zodToFieldErrors(error));
  }

  if (error instanceof mongoose.Error.ValidationError) {
    return ApiError.validation(mongooseToFieldErrors(error));
  }

  /* A malformed id in the URL is a client mistake, not a server fault, and it
     must not surface as a 500. */
  if (error instanceof mongoose.Error.CastError) {
    return ApiError.badRequest('That identifier is not valid');
  }

  const mongoError = error as MongoServerError;
  if (mongoError?.code === 11000) {
    const field = Object.keys(mongoError.keyPattern ?? {})[0];
    if (field === 'email') {
      return ApiError.conflict('An account with that email already exists', 'EMAIL_IN_USE');
    }
    if (field === 'userId' || field === 'recipeId') {
      return ApiError.conflict('You have already reviewed this recipe', 'DUPLICATE_REVIEW');
    }
    return ApiError.conflict('That already exists');
  }

  /* express.json() rejects malformed bodies and oversized payloads with a typed
     error rather than a thrown string. */
  const bodyError = error as Error & { type?: string; status?: number };
  if (bodyError?.type === 'entity.too.large') {
    return ApiError.tooLarge('That request body is too large');
  }
  if (bodyError?.type === 'entity.parse.failed') {
    return ApiError.badRequest('The request body is not valid JSON');
  }

  const multerError = error as Error & { code?: string };
  if (multerError?.code === 'LIMIT_FILE_SIZE') {
    return ApiError.tooLarge('That image is too large');
  }

  return ApiError.internal();
}

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  /* Express cannot amend a response whose headers have already been flushed;
     hand it back so the default handler can destroy the socket. */
  if (res.headersSent) {
    next(error);
    return;
  }

  const apiError = normalise(error);
  const requestId = randomUUID();

  const context = {
    requestId,
    method: req.method,
    path: req.originalUrl,
    status: apiError.status,
    code: apiError.code,
  };

  if (apiError.status >= 500) {
    // A real fault: keep the stack, and keep it out of the response.
    logger.error({ ...context, err: error }, apiError.message);
  } else {
    logger.warn(context, apiError.message);
  }

  const body: ApiFailure = {
    success: false,
    error: {
      code: apiError.code,
      /* In production an unexpected failure says nothing specific. The requestId
         is how support correlates the user's report with the log line. */
      message:
        isProduction && apiError.status >= 500
          ? 'Something went wrong on our end'
          : apiError.message,
      ...(apiError.fields ? { fields: apiError.fields } : {}),
      requestId,
    },
  };

  res.status(apiError.status).json(body);
};
