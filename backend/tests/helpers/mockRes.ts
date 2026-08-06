import { Response } from 'express';
import type { vi } from 'vitest';

/**
 * Cria um Response mockado do Express com vi.fn() para status/json/send.
 * encadeável: res.status(...).json(...)
 */
export function mockRes(): Response & { status: any; json: any; send: any } {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  return res;
}
