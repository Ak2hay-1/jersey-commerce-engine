import { HttpException, HttpStatus } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';
import type { Request, Response } from 'express';
import type { ArgumentsHost } from '@nestjs/common';

function createHost(url = '/api/v1/products/missing') {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const response = { status } as unknown as Response;
  const request = { url, headers: { 'x-request-id': 'req-1' } } as unknown as Request;
  const host = {
    switchToHttp: () => ({ getResponse: () => response, getRequest: () => request }),
  } as ArgumentsHost;
  return { host, json, status };
}

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter();

  it('returns RESOURCE_NOT_FOUND without exposing internals', () => {
    const { host, json, status } = createHost();
    filter.catch(
      new HttpException({ code: 'RESOURCE_NOT_FOUND', message: 'Resource not found' }, HttpStatus.NOT_FOUND),
      host,
    );
    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'RESOURCE_NOT_FOUND',
        message: 'Resource not found',
        details: undefined,
        timestamp: expect.any(String),
        path: '/api/v1/products/missing',
        requestId: 'req-1',
      },
    });
  });

  it('hides unexpected error details', () => {
    const { host, json, status } = createHost('/ready');
    filter.catch(new Error('secret stack'), host);
    expect(status).toHaveBeenCalledWith(500);
    const body = json.mock.calls[0]?.[0] as { error: { message: string; details?: unknown } };
    expect(body.error.message).toBe('An unexpected error occurred.');
    expect(body.error.message).not.toContain('secret stack');
    expect(body.error.details).toBeUndefined();
  });

  it('passes structured conflict details through for duplicate customers', () => {
    const { host, json, status } = createHost('/api/v1/customers');
    filter.catch(
      new HttpException(
        {
          code: 'CONFLICT',
          message: 'A possible duplicate customer already exists.',
          details: { possibleMatches: [{ id: 'c1' }] },
        },
        HttpStatus.CONFLICT,
      ),
      host,
    );
    expect(status).toHaveBeenCalledWith(409);
    const body = json.mock.calls[0]?.[0] as { error: { details?: { possibleMatches: Array<{ id: string }> } } };
    expect(body.error.details?.possibleMatches[0]?.id).toBe('c1');
  });
});
