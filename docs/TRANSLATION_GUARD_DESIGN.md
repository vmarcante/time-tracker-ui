# Sistema de Traduções

## Estrutura

As traduções foram divididas por contexto para evitar exposição desnecessária de funcionalidades para usuários que não acessam essas funcionalidades:

```
/assets/i18n/
├── pt/
│   ├── common.json    # Textos comuns, validações, loading
│   ├── layout.json    # Header, menu, navegação
│   └── auth.json      # Autenticação, login, registro, recuperação de senha
└── en/
    ├── common.json    # Common texts, validations, loading
    ├── layout.json    # Header, menu, navigation
    └── auth.json      # Authentication, login, register, password recovery
```

## Como Usar

### 1. Carregar contexto em uma rota

Use o guard `translationContextGuard` para carregar traduções antes de acessar a rota:

```typescript
import { translationContextGuard } from '@shared/guards/translation-context.guard';

const routes: Routes = [
  {
    path: 'auth',
    canActivate: [translationContextGuard('auth')],
    loadChildren: () => import('./auth/auth.routes')
  }
];
```

### 2. Carregar contexto programaticamente

```typescript
import { TranslationService } from '@shared/services/translation.service';

constructor(private translationService: TranslationService) {}

async loadAuthTranslations() {
  await this.translationService.loadContext('pt', 'auth');
}
```

### 3. Contextos Básicos

Os contextos podem ser carregados automaticamente ao inicializar o `TranslationService` se definidos no array `commonContexts` do serviço, isso não irá respeitar o guard.

## Adicionar Novo Contexto

1. Criar arquivo: `/assets/i18n/pt/[contexto].json`
2. Adicionar traduções no formato:
```json
{
  "contexto": {
    "chave": "valor"
  }
}
```

3. Carregar via guard ou programaticamente
