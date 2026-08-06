# Deploy no IIS (Internet Information Services)

## Pré-requisitos

1. **IIS instalado** no Windows Server
2. **URL Rewrite Module** instalado no IIS
   - Download: https://www.iis.net/downloads/microsoft/url-rewrite
3. **Node.js e npm** instalados para build

## Passo a Passo

### 1. Build da Aplicação

Execute o build de produção:

```bash
npm run build:prod
```

Isso gerará os arquivos em: `dist/time-tracker-ui/browser/`

### 2. Preparar Arquivos

Os arquivos gerados incluem:
- `index.html` - Página principal
- `*.js` - JavaScript bundles
- `*.css` - Estilos
- `assets/` - Recursos estáticos (imagens, ícones, traduções)
- `web.config` - Configuração do IIS (gerado automaticamente)

### 3. Configurar IIS

#### 3.1. Criar um novo Site ou Application

1. Abra o **IIS Manager**
2. Clique com botão direito em **Sites** > **Add Website** ou **Add Application**
3. Configure:
   - **Site name**: `time-tracker-ui`
   - **Physical path**: Caminho para `dist/time-tracker-ui/browser/`
   - **Binding**: 
     - Type: `http` ou `https`
     - Port: `80` (http) ou `443` (https)
     - Host name: seu domínio (ex: `www.time-tracker.com`)

#### 3.2. Configurar Application Pool

1. No IIS Manager, vá em **Application Pools**
2. Selecione o pool da sua aplicação
3. Clique em **Basic Settings**
4. Configure:
   - **.NET CLR version**: `No Managed Code`
   - **Managed pipeline mode**: `Integrated`

### 4. Verificar web.config

O arquivo `web.config` já está configurado com:

- **URL Rewriting**: Redireciona todas as rotas para `index.html`
- **MIME Types**: Configurados para `.json`, `.woff`, `.woff2`, `.svg`
- **Cache Headers**: Desabilitado para desenvolvimento

### 5. Configurar HTTPS (Recomendado)

1. Obtenha um certificado SSL (Let's Encrypt, Certbot, etc.)
2. No IIS Manager, selecione seu site
3. Clique em **Bindings** > **Add**
4. Configure:
   - Type: `https`
   - Port: `443`
   - SSL certificate: Selecione seu certificado

### 6. Configurar Domínio

Se estiver usando um subdiretório (ex: `https://exemplo.com/app/`):

1. Faça build com `baseHref` customizado:
   ```bash
   ng build --configuration production --base-href /app/
   ```

2. Ou edite `angular.json` para adicionar uma configuração específica:
   ```json
   "subdirectory": {
     "baseHref": "/app/",
     ...
   }
   ```

### 7. Variáveis de Ambiente

Para configurar a API URL em produção:

1. Edite `src/environments/environment.prod.ts`:
   ```typescript
   export const environment = {
     production: true,
     apiUrl: 'https://api.time-tracker.com',
     ...
   };
   ```

2. Faça rebuild:
   ```bash
   npm run build:prod
   ```

## Troubleshooting

### Erro 404 ao navegar

- **Causa**: URL Rewrite Module não instalado
- **Solução**: Instale o URL Rewrite Module do IIS

### Assets não carregam

- **Causa**: Caminhos incorretos
- **Solução**: Verifique se `baseHref` está configurado corretamente

### Erro 500

- **Causa**: Problema no `web.config`
- **Solução**: Verifique a sintaxe do XML no `web.config`

### CORS Errors

- **Causa**: API em domínio diferente
- **Solução**: Configure CORS no backend

## Estrutura de Pastas no IIS

```
C:\inetpub\wwwroot\time-tracker-ui\
├── index.html
├── web.config
├── main-[hash].js
├── polyfills-[hash].js
├── styles-[hash].css
└── assets\
    ├── icons\
    ├── images\
    └── i18n\
        ├── pt.json
        └── en.json
```

## Comandos Úteis

```bash
# Build de produção
npm run build:prod

# Build local (teste)
npm run build:local

# Build com análise de bundle
npm run build:stats

# Servir localmente
npm start
```

## Checklist de Deploy

- [ ] Build de produção executado
- [ ] URL Rewrite Module instalado no IIS
- [ ] Site/Application criado no IIS
- [ ] Application Pool configurado (No Managed Code)
- [ ] web.config presente na pasta
- [ ] Certificado SSL configurado (se HTTPS)
- [ ] Domínio apontando para o servidor
- [ ] API URL configurada corretamente
- [ ] Teste de navegação entre rotas
- [ ] Teste de refresh da página
- [ ] Assets carregando corretamente
