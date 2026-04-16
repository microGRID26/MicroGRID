// lib/partner-api/errors.ts — Uniform error shape for the partner API.
//
// Responses follow RFC 7807-ish: { error: { code, message, request_id, details? } }.
// Handlers throw ApiError; the middleware converts it to a Response.

import { NextResponse } from 'next/server'

export type ApiErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'invalid_request'
  | 'rate_limited'
  | 'idempotency_conflict'
  | 'signature_required'
  | 'signature_invalid'
  | 'timestamp_invalid'
  | 'actor_required'
  | 'actor_unknown'
  | 'internal_error'
  | 'service_unavailable'

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  invalid_request: 400,
  rate_limited: 429,
  idempotency_conflict: 409,
  signature_required: 401,
  signature_invalid: 401,
  timestamp_invalid: 401,
  actor_required: 400,
  actor_unknown: 403,
  internal_error: 500,
  service_unavailable: 503,
}

export class ApiError extends Error {
  public readonly code: ApiErrorCode
  public readonly status: number
  public readonly details: Record<string, unknown> | undefined

  constructor(code: ApiErrorCode, message: string, details?: Record<string, unknown>) {
    super(message)
    this.code = code
    this.status = STATUS_BY_CODE[code]
    this.details = details
  }
}

export interface ErrorBody {
  error: {
    code: ApiErrorCode
    message: string
    request_id: string
    details?: Record<string, unknown>
  }
}

export function errorResponse(err: ApiError, requestId: string): NextResponse<ErrorBody> {
  const body: ErrorBody = {
    error: {
      code: err.code,
      message: err.message,
      request_id: requestId,
    },
  }
  if (err.details) body.error.details = err.details
  return NextResponse.json(body, {
    status: err.status,
    headers: { 'X-Request-Id': requestId },
  })
}

export function internalError(requestId: string, message = 'Internal server error'): NextResponse<ErrorBody> {
  return errorResponse(new ApiError('internal_error', message), requestId)
}
