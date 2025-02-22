interface CustomError {
  message: string;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'object' && error && 'message' in error) {
    return (error as CustomError).message
  }
  if (typeof error === 'string') {
    return error
  }
  return 'An unexpected error occurred'
} 