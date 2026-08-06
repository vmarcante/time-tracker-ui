---
trigger: always_on
---

You are an expert in TypeScript, Angular, and scalable web application development. You write functional, maintainable, performant, and accessible code following Angular and TypeScript best practices.

## TypeScript Best Practices

- Use strict type checking
- Prefer type inference when the type is obvious
- Avoid the `any` type; use `unknown` when type is uncertain

## Angular Best Practices

- Always use standalone components over NgModules
- Must NOT set `standalone: true` inside Angular decorators. It's the default in Angular v20+.
- Use signals for state management
- Implement lazy loading for feature routes
- Do NOT use the `@HostBinding` and `@HostListener` decorators. Put host bindings inside the `host` object of the `@Component` or `@Directive` decorator instead
- Use `NgOptimizedImage` for all static images.
  - `NgOptimizedImage` does not work for inline base64 images.

## Accessibility Requirements

- It MUST pass all AXE checks.
- It MUST follow all WCAG AA minimums, including focus management, color contrast, and ARIA attributes.

### Components

- Keep components small and focused on a single responsibility
- Use `input()` and `output()` functions instead of decorators
- Use `computed()` for derived state
- Prefer inline templates for small components
- Prefer Reactive forms instead of Template-driven ones
- Do NOT use `ngClass`, use `class` bindings instead
- Do NOT use `ngStyle`, use `style` bindings instead
- When using external templates/styles, use paths relative to the component TS file.
- Never create a component with inline style on typescript, always on HTML files and SCSS styles

## State Management

- Use signals for local component state
- Use `computed()` for derived state
- Keep state transformations pure and predictable
- Do NOT use `mutate` on signals, use `update` or `set` instead

## Templates

- Keep templates simple and avoid complex logic
- Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- Use the async pipe to handle observables
- Do not assume globals like (`new Date()`) are available.
- Do not use emojis in templates or components, for styling purposes or any other reason, even on console logs, never.

## Services

- Design services around a single responsibility
- Use the `providedIn: 'root'` option for singleton services
- Use the `inject()` function instead of constructor injection

## Objects

- On API Integrations that was specified in a file, always read the return response and map it to the interface.
- Never use `any` or `unknown` types directly. Always define proper interfaces for API responses.
- On Components and variables always use proper types instead of `any` or `unknown`.

## Styles

- Use SCSS for styling
- Use CSS variables for colors and spacing
- Follow BEM methodology for class naming
- Keep styles modular and reusable
- Avoid using `!important` unless absolutely necessary
- Use `:host` for component-level styles
- Use `::ng-deep` only when necessary
- Avoid using global styles, use component-level styles instead
- Avoid using inline styles, use component-level styles instead
- Avoid using gradient colors, images or styles, only when specifically requested

## Documents

- Do not create documents without being explicitly asked to do so. Ex: README.md, CHANGELOG.md, FEATURE.md, etc.
- Do not create use examples documents or markdown files with examples of how to use the code.

## Image or Assets

- All SVGs icons should be in the `src/assets/icons/` folder.
- All images should be in the `src/assets/images/` folder.
- All icons should be in the `src/assets/icons/` folder.
- Dot not use inline svg tags, use the `src/assets/icons/` folder instead.
- All icons and images names must be descriptive and follow the pattern of the project.
- Avoid single or short names for icons and images.

## Language

- All code, comments, and documentation must be written in English.
- All template strings and console logs must be written in English.
- All template texts for HTML and components must be internationalized using i18n and pipes

## Development

- On complex logics with multiple returns, always prefer using early returns pattern to improve readability and maintainability
- Avoids nested if statements, use early returns pattern instead
- Avoids using try/catch blocks, use error handling patterns instead
- Always open and close {} blocks, even if it's a single line
- Avoids using deprecated methods and properties
- On exported types, always creates at `src/shared/types/` folder