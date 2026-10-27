import { ElementRef, Signal, afterNextRender, inject, signal } from '@angular/core';

/** Classe aplicada aos painéis de overlay abertos a partir de uma tela (e não de um modal). */
export const PAGE_PANEL_CLASS = 'app-overlay--page';

/**
 * Os painéis do select e do datepicker vivem no `.cdk-overlay-container`, fora do
 * `.layout-wrapper`, e por isso não herdam os tokens de toque das telas. Este helper devolve a
 * classe que o painel deve receber quando o componente está numa tela; dentro de um modal a
 * lista fica vazia e o painel mantém o visual atual.
 *
 * Precisa ser chamado em contexto de injeção (inicializador de campo ou construtor).
 */
export function createPagePanelClass(): Signal<string[]> {
  const host = inject<ElementRef<HTMLElement>>(ElementRef);
  const panelClass = signal<string[]>([]);

  afterNextRender(() => {
    if (host.nativeElement.closest('.layout-wrapper')) {
      panelClass.set([PAGE_PANEL_CLASS]);
    }
  });

  return panelClass.asReadonly();
}
