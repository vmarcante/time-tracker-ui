# 🎨 Design System — Time Tracker

> Organize suas horas de trabalho

---

# Logo

## Versão Principal

- Logotipo: **Time Tracker**
- Tipografia: **Plus Jakarta Sans**
- Uso preferencial sobre fundo branco.
- Em fundos escuros utilizar a versão branca.

---

# Paleta Primária

## Escala Cinza

| Escala  | Hex         | Uso                 |
| ------- | ----------- | ------------------- |
| 50      | `#F9FAFB`   | Fundos muito claros |
| 100     | `#F3F4F6`   | Hover claro         |
| 200     | `#E5E7EB`   | Backgrounds         |
| 300     | `#D1D5DB`   | Elementos suaves    |
| 400     | `#9CA3AF`   | Destaques           |
| 500     | `#6B7280`   | Textos médios       |
| **600** | **#4B5563** | **Cor Primária**    |
| 700     | `#374151`   | Hover               |
| 800     | `#1F2937`   | Active              |
| 900     | `#111827`   | Contraste máximo    |

---

# Cor de Destaque

## Vermelho

| Tipo    | Hex       |
| ------- | --------- |
| Light   | `#F87171` |
| **Base**| **#DC2626** |
| Dark    | `#B91C1C` |

### Uso

- Botões de ação principal
- Elementos de destaque
- Ponteiros de relógio
- Indicadores de contraste

---

# Cores Neutras

## Fundos

| Elemento | Hex       |
| -------- | --------- |
| Base     | `#FAFAFA` |
| Surface  | `#F3F6F7` |
| Card     | `#FFFFFF` |

---

## Bordas

| Elemento | Hex       |
| -------- | --------- |
| Divider  | `#E5E7EB` |
| Border   | `#D1D5DB` |

---

## Textos

| Tipo         | Hex       |
| ------------ | --------- |
| Primário     | `#0F172A` |
| Secundário   | `#334155` |
| Terciário    | `#64748B` |
| Desabilitado | `#94A3B8` |

---

## Ícones

| Tipo         | Hex       |
| ------------ | --------- |
| Primário     | `#4B5563` |
| Secundário   | `#374151` |
| Desabilitado | `#94A3B8` |
| Invertido    | `#FFFFFF` |

---

# Cores Semânticas

## Receita (Success)

| Tipo          | Hex       |
| ------------- | --------- |
| Receita       | `#16A34A` |
| Fundo Receita | `#ECFDF5` |

---

## Despesa (Error)

| Tipo          | Hex       |
| ------------- | --------- |
| Despesa       | `#DC2626` |
| Fundo Despesa | `#FEF2F2` |

---

## Atenção (Warning)

| Tipo          | Hex       |
| ------------- | --------- |
| Atenção       | `#F59E0B` |
| Fundo Atenção | `#FFFBE7` |

---

## Informação (Info)

| Tipo             | Hex       |
| ---------------- | --------- |
| Informação       | `#2563EB` |
| Fundo Informação | `#EFF6FF` |

---

# Componentes

## Botão Primário

Background

```css
#DC2626
```

Texto

```css
#FFFFFF
```

Hover

```css
#B91C1C
```

Active

```css
#991B1B
```

---

## Botão Secundário

Background

```css
transparent
```

Borda

```css
#4B5563
```

Texto

```css
#4B5563
```

Hover

```css
#F3F4F6
```

---

## Link

Cor

```css
#DC2626
```

Hover

```css
#B91C1C
```

---

## Campo de Texto

### Default

```text
Background: #FFFFFF
Border: #D1D5DB
Text: #0F172A
```

### Focus

```text
Border: #DC2626
```

### Disabled

```text
Background: #F3F6F7
Text: #94A3B8
```

---

## Select

Mesmo comportamento do Input.

---

## Checkbox

Selecionado

- Fundo: `#DC2626`
- Ícone: branco

Não selecionado

- Fundo branco
- Borda `#D1D5DB`

---

## Radio

Selecionado

- Borda `#DC2626`
- Centro `#DC2626`

---

## Switch

Ativo

```css
background: #dc2626;
```

Inativo

```css
background: #d1d5db;
```

---

# Alertas

## Sucesso

```yaml
Background: #ECFDF5
Ícone: #16A34A
Texto: #0F172A
```

Exemplo

> Receita cadastrada com sucesso!

---

## Atenção

```yaml
Background: #FFFBE7
Ícone: #F59E0B
Texto: #0F172A
```

Exemplo

> Atenção! Você possui contas vencendo em 3 dias.

---

## Erro

```yaml
Background: #FEF2F2
Ícone: #DC2626
Texto: #0F172A
```

---

## Informação

```yaml
Background: #EFF6FF
Ícone: #2563EB
Texto: #0F172A
```

---

# Dashboard

## Card Financeiro

```
Saldo Total

R$ 24.560,75

↑ 8,45%
```

Receitas

Cor

```css
#16A34A
```

Despesas

Cor

```css
#DC2626
```

---

# Gráfico

## Distribuição

- Horas registradas — Vermelho
- Projetos — Cinza 600
- Pausas — Cinza 400
- Outros — Âmbar 500

---

# Tipografia

## Família

**Plus Jakarta Sans**

---

## Pesos

| Peso | Uso        |
| ---- | ---------- |
| 700  | Títulos    |
| 600  | Subtítulos |
| 500  | Botões     |
| 400  | Corpo      |

---

## Escala

| Elemento   | Tamanho |
| ---------- | ------- |
| Display    | 48px    |
| H1         | 36px    |
| H2         | 30px    |
| H3         | 24px    |
| H4         | 20px    |
| H5         | 18px    |
| Body Large | 16px    |
| Body       | 14px    |
| Small      | 12px    |
| Caption    | 11px    |

---

# Espaçamento

| Token | Valor |
| ----- | ----- |
| xs    | 4px   |
| sm    | 8px   |
| md    | 16px  |
| lg    | 24px  |
| xl    | 32px  |
| xxl   | 48px  |

---

# Border Radius

| Token | Valor |
| ----- | ----- |
| sm    | 4px   |
| md    | 8px   |
| lg    | 12px  |
| xl    | 16px  |
| pill  | 999px |

---

# Sombras

## Card

```css
0 4px 12px rgba(15, 23, 42, .08)
```

## Hover

```css
0 8px 24px rgba(15,23,42,.12)
```

---

# Responsividade

## Breakpoints

| Faixa   | Largura        | Mixin (`utilities/breakpoints`)     |
| ------- | -------------- | ----------------------------------- |
| Celular | < 600px        | `bp.phone` (refina dentro do mobile) |
| Mobile  | < 768px        | `bp.mobile`                         |
| Tablet  | 768px – 1023px | `bp.tablet-only` / `bp.tablet-down` |
| Desktop | ≥ 1024px       | `bp.desktop`                        |

## Mobile (conteúdo das páginas)

| Item                     | Desktop | Mobile                    |
| ------------------------ | ------- | ------------------------- |
| Altura de campos         | 36px    | 44px (`--input-height`)   |
| Alvo de toque mínimo     | —       | 44px (`--tap-target-min`) |
| Texto de campos          | 13px    | 16px (evita zoom no iOS)  |
| Texto auxiliar           | 11px    | 12px                      |
| Margem lateral da página | 24px    | 16px (`--page-gutter`)    |

Modais, login e cadastro mantêm os tamanhos de desktop. Efeitos de hover (escala, sombra) só valem com mouse (`bp.hover-capable`).

Padrões: header sempre no fluxo (menu de contexto em 2ª linha), popover como cartão centralizado, toast em largura total abaixo do header, paginação compacta ("3 / 12") e sidebar do workspace como faixa horizontal rolável. Convenções de código: mixins em `src/styles/utilities/_breakpoints.scss`, `tap-min()` em `_touch.scss` e tokens em `_variables.scss`.

Tracker e detalhe do lançamento: no mobile o calendário lateral fica recolhido atrás de um botão de período (tablet: resumo e calendário lado a lado), filtros empilham em largura total e o painel da sessão selecionada vira um _bottom sheet_ fixo na base da tela (≤ 1023px). Em dispositivos de toque, tocar na linha do tempo mostra uma sessão-fantasma com a barra "Criar sessão"/cancelar; com mouse o clique cria direto. O desktop (≥ 1025px) permanece idêntico.

---

# Princípios

- Clareza
- Organização
- Confiança
- Simplicidade
- Consistência

A identidade visual utiliza o **cinza** como cor principal para transmitir simplicidade e elegância, enquanto o **vermelho** destaca ações e informações importantes como um relógio, mantendo uma interface limpa e moderna.
