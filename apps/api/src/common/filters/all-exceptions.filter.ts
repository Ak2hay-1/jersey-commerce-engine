import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Prisma } from '../../../generated/prisma';
import { API_ERROR_CODES, type ApiErrorCode, type ApiErrorResponse } from '@jersey-commerce/types';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const request = http.getRequest<Request>();
    const { status, code, message, details } = this.normalize(exception);
    const requestIdHeader = request.headers['x-request-id'];
    const requestId = Array.isArray(requestIdHeader) ? requestIdHeader[0] : requestIdHeader;

    const payload: ApiErrorResponse = {
      success: false,
      error: {
        code,
        message,
        details,
        timestamp: new Date().toISOString(),
        path: request.url,
        requestId,
      },
    };

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error({ message, code, status, path: request.url, requestId });
    } else {
      this.logger.warn({ message, code, status, path: request.url, requestId });
    }

    response.status(status).json(payload);
  }

  private normalize(exception: unknown): {
    status: number;
    code: ApiErrorCode;
    message: string;
    details?: unknown;
  } {
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2025') {
        return { status: HttpStatus.NOT_FOUND, code: 'RESOURCE_NOT_FOUND', message: 'Resource not found' };
      }
      if (exception.code === 'P2002') {
        return {
          status: HttpStatus.CONFLICT,
          code: 'CONFLICT',
          message: 'A record with this value already exists.',
        };
      }
      if (exception.code === 'P2003') {
        return { status: HttpStatus.BAD_REQUEST, code: 'BAD_REQUEST', message: 'Related record was not found.' };
      }
      return { status: HttpStatus.INTERNAL_SERVER_ERROR, code: 'INTERNAL_ERROR', message: 'A database error occurred.' };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      const parsed = this.readHttpPayload(exceptionResponse);
      return {
        status,
        code: parsed.code ?? this.statusToCode(status),
        message: parsed.message,
        details: parsed.details,
      };
    }

    return { status: HttpStatus.INTERNAL_SERVER_ERROR, code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' };
  }

  private readHttpPayload(value: unknown): { message: string; code?: ApiErrorCode; details?: unknown } {
    if (typeof value === 'string') {
      return { message: value };
    }
    if (typeof value !== 'object' || value === null) {
      return { message: 'Request failed.' };
    }
    const record = value as { message?: unknown; code?: unknown; details?: unknown };
    const message = Array.isArray(record.message)
      ? record.message.map(String).join(', ')
      : typeof record.message === 'string'
        ? record.message
        : 'Request failed.';
    const code =
      typeof record.code === 'string' && (API_ERROR_CODES as readonly string[]).includes(record.code)
        ? (record.code as ApiErrorCode)
        : undefined;
    return {
      message,
      code,
      details:
        'details' in record && record.details !== undefined
          ? record.details
          : Array.isArray(record.message)
            ? { messages: record.message }
            : undefined,
    };
  }

  private statusToCode(status: number): ApiErrorCode {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'BAD_REQUEST';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'RESOURCE_NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'UNPROCESSABLE_ENTITY';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'TOO_MANY_REQUESTS';
      case HttpStatus.SERVICE_UNAVAILABLE:
        return 'SERVICE_UNAVAILABLE';
      default:
        return status >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST';
    }
  }
}
