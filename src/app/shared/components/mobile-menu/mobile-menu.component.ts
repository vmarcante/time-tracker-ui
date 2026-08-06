import { Component, input, output, effect, inject, signal, computed } from '@angular/core';
import { CommonModule, DOCUMENT } from '@angular/common';
import { NgComponentOutlet } from '@angular/common';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { MobileMenuLevel, MobileMenuLink, MobileMenuTheme } from '../../types';

@Component({
  selector: 'app-mobile-menu',
  imports: [CommonModule, NgComponentOutlet, TranslatePipe],
  templateUrl: './mobile-menu.component.html',
  styleUrl: './mobile-menu.component.scss',
})
export class MobileMenuComponent {
  private document = inject(DOCUMENT);

  isOpen = input.required<boolean>();
  isAuthenticated = input.required<boolean>();
  links = input.required<MobileMenuLink[]>();
  theme = input.required<MobileMenuTheme>();
  rootTitle = input<string>('Menu');
  showRootTitle = input<boolean>(true);

  close = output<void>();
  login = output<void>();
  logout = output<void>();

  private menuStack = signal<MobileMenuLevel[]>([]);
  renderedStack = signal<MobileMenuLevel[]>([]);
  transitionEnabled = signal(true);

  currentIndex = computed(() => this.menuStack().length - 1);

  trackTransform = computed(() => {
    return `translateX(-${this.currentIndex() * 100}%)`;
  });

  constructor() {
    effect(() => {
      const isOpen = this.isOpen();
      if (!isOpen) {
        return;
      }

      const initialLevel = { title: this.rootTitle(), links: this.links() };
      this.menuStack.set([initialLevel]);
      this.renderedStack.set([initialLevel]);
      this.transitionEnabled.set(false);
      setTimeout(() => {
        this.transitionEnabled.set(true);
      }, 0);
    });

    effect((onCleanup) => {
      const html = this.document.documentElement;

      if (this.isOpen()) {
        html.classList.add('mobile-menu-open');
        this.document.body.classList.add('mobile-menu-open');
      } else {
        html.classList.remove('mobile-menu-open');
        this.document.body.classList.remove('mobile-menu-open');
      }

      onCleanup(() => {
        html.classList.remove('mobile-menu-open');
        this.document.body.classList.remove('mobile-menu-open');
      });
    });
  }

  get currentLevel(): MobileMenuLevel {
    const stack = this.menuStack();
    return stack[stack.length - 1] ?? { title: 'Menu', links: [] };
  }

  get canGoBack(): boolean {
    return this.menuStack().length > 1;
  }

  pushLevel(link: MobileMenuLink): void {
    const children = link.children ?? [];
    if (children.length === 0 && !link.component) {
      return;
    }

    const nextLevel: MobileMenuLevel = {
      title: link.label,
      links: children,
      component: link.component,
      componentInputs: link.componentInputs,
    };
    this.menuStack.update((stack) => [...stack, nextLevel]);
    this.renderedStack.update((stack) => [...stack, nextLevel]);
  }

  goBack(): void {
    this.menuStack.update((stack) => stack.slice(0, -1));
  }

  onTrackTransitionEnd(event: TransitionEvent): void {
    if (event.target !== event.currentTarget || event.propertyName !== 'transform') {
      return;
    }

    if (this.renderedStack().length <= this.menuStack().length) {
      return;
    }

    this.transitionEnabled.set(false);
    this.renderedStack.set(this.menuStack());
    setTimeout(() => {
      this.transitionEnabled.set(true);
    }, 0);
  }

  onLinkClick(link: MobileMenuLink): void {
    if (link.component || (link.children && link.children.length > 0)) {
      this.pushLevel(link);
      return;
    }

    link.action?.();
    this.close.emit();
  }

  get mobileMenuClasses(): Record<string, boolean> {
    return {
      'mobile-menu--open': this.isOpen(),
    };
  }

  get drawerClasses(): Record<string, boolean> {
    const theme = this.theme();

    return {
      'mobile-menu__drawer--authenticated': theme === 'authenticated',
      'mobile-menu__drawer--landing': theme === 'landing',
      'mobile-menu__drawer--scrolled': theme === 'scrolled',
    };
  }
}
