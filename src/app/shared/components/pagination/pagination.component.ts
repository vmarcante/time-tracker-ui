import { Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { IconComponent } from '../icon/icon.component';

export type PageItem = number | '…';

@Component({
  selector: 'app-pagination',
  imports: [CommonModule, TranslatePipe, IconComponent],
  templateUrl: './pagination.component.html',
  styleUrl: './pagination.component.scss',
})
export class PaginationComponent {
  
  /** Página atual  1-based */
  page = input.required<number>();
  totalPages = input.required<number>();
  /** Se informado, exibe "N itens" no rodapé */
  totalElements = input<number | null>(null);
  loading = input<boolean>(false);

  pageChange = output<number>();

  readonly isFirst = computed(() => this.page() <= 1);
  readonly isLast = computed(() => this.page() >= this.totalPages());
  readonly visible = computed(() => this.totalPages() > 1);

  /**
   * Janela de páginas: sempre inclui a primeira, a última e current±1;
   * lacunas são representadas por '…'
   */
  readonly pageItems = computed<PageItem[]>(() => {
    const total = this.totalPages();
    const current = this.page();

    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const pages = new Set<number>([1, total, current - 1, current, current + 1]);
    const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);

    const items: PageItem[] = [];
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i]! - sorted[i - 1]! > 1) {
        items.push('…');
      }
      items.push(sorted[i]!);
    }
    return items;
  });

  goTo(target: number): void {
    if (this.loading() || target < 1 || target > this.totalPages() || target === this.page()) {
      return;
    }
    this.pageChange.emit(target);
  }

  prev(): void {
    this.goTo(this.page() - 1);
  }

  next(): void {
    this.goTo(this.page() + 1);
  }

  trackItem(_index: number, item: PageItem): string {
    return String(item);
  }
}
