export type SupportedLanguages = 'pt' | 'en';

export const SUPPORTED_LANGUAGES: readonly SupportedLanguages[] = [
  'pt',
  // 'en', // Temporariamente desabilitado — apenas pt-BR por enquanto
] as const;
