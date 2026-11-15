import 'server-only';

export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
    public errors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const notFound = () => new AppError(404, 'Resource not found');
export const forbidden = () => new AppError(403, 'Forbidden');
export const conflict = (message: string) => new AppError(409, message);
export const invalid = (errors: Record<string, string[]>) => new AppError(422, 'Validation failed', errors);
