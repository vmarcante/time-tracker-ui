export interface ErrorMessageContext {
  [key: string]: string | number;
}

export interface FieldErrorMapping {
  errorKey: string;
  translationKey: string;
  context?: (errors: Record<string, unknown>) => ErrorMessageContext;
  condition?: (fieldName: string, errors: Record<string, unknown>) => boolean;
}
