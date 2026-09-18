import type { Response } from 'express';
import type { ApiSuccess, Paginated, PaginationMeta } from '@cafera/shared';

/**
 * Response helpers.
 *
 * Every successful endpoint answers with `{ success: true, data }` and nothing
 * else. A uniform envelope means the client has exactly one unwrapping path and
 * one narrowing check, instead of a per-endpoint guess about whether the payload
 * is the resource, an array, or a wrapper around either.
 */

export function sendSuccess<T>(res: Response, data: T, status = 200): Response {
  const body: ApiSuccess<T> = { success: true, data };
  return res.status(status).json(body);
}

export function sendCreated<T>(res: Response, data: T): Response {
  return sendSuccess(res, data, 201);
}

export function sendNoContent(res: Response): Response {
  return res.status(204).send();
}

export function buildPagination(total: number, page: number, limit: number): PaginationMeta {
  const totalPages = limit > 0 ? Math.max(1, Math.ceil(total / limit)) : 1;
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

export function paginate<T>(items: T[], total: number, page: number, limit: number): Paginated<T> {
  return { items, pagination: buildPagination(total, page, limit) };
}
