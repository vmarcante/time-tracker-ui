import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnChanges,
  SimpleChanges,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonColorType, ButtonIcon, ButtonLoadingStyle, ButtonSize } from '../../types';
import { LoadingComponent } from "../loading/loading.component";
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-button',
  imports: [CommonModule, LoadingComponent, IconComponent],
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss',
})
export class ButtonComponent implements AfterViewInit, OnChanges {
  @ViewChild('buttonRef') buttonRef!: ElementRef<HTMLButtonElement>;
  @ViewChild('loadingRect') loadingRect!: ElementRef<SVGRectElement>;

  // Basic Configuration
  @Input() text: string | number | null = null;
  @Input() type: 'button' | 'submit' = 'button';
  @Input() disabled: boolean = false;
  @Input() loading: boolean = false;
  @Input() loadingStyle: ButtonLoadingStyle = 'spinner';
  @Input() uppercase: boolean = false;

  // Display Options
  @Input() layoutType: 'text' | 'icon' = 'text';
  @Input() size?: ButtonSize;
  @Input() icon?: ButtonIcon;
  @Input() color: ButtonColorType = 'primary';
  @Input() customClass: string = '';
  @Input() rounded: boolean = false;
  @Input() circle: boolean = false;
  @Input() fill: boolean = false;

  // Extra
  @Input() hoverTitle: string = '';
  @Input() hoverTitleDisabled: string = '';

  @Output() buttonClick = new EventEmitter<MouseEvent>();

  loadingAnimationProps: {
    buttonWidth: number;
    buttonHeight: number;
    buttonRadius: number;
    buttonPerimeter: number;
    glowLength: number;
  } = {
    buttonWidth: 0,
    buttonHeight: 0,
    buttonRadius: 0,
    buttonPerimeter: 0,
    glowLength: 0,
  };

  get iconClasses(): Record<string, boolean> {
    const position = this.icon?.position;
    const isIconOnly = this.icon?.iconOnly ?? false;

    return {
      'btn__icon': true,
      'btn__icon--left': position === 'left' && !isIconOnly,
      'btn__icon--right': position === 'right' && !isIconOnly,
    };
  }

  constructor(private cdr: ChangeDetectorRef) {}

  // ====================
  // ====================
  /**
   * Loading animations
   */
  // ====================

  ngAfterViewInit(): void {
    this.updateDimensions();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['loading'] && this.loading) {
      this.updateDimensions();
      this.recalculateWithSvgLength();
    }
  }

  private recalculateWithSvgLength(): void {
    requestAnimationFrame(() => {
      if (this.loadingRect?.nativeElement) {
        const realLength = this.loadingRect.nativeElement.getTotalLength();
        this.loadingAnimationProps.buttonPerimeter = realLength;
        this.loadingAnimationProps.glowLength = realLength * 0.2;
        this.cdr.detectChanges();
      }
    });
  }

  private updateDimensions(): void {
    if (!this.buttonRef?.nativeElement) {
      return;
    }

    const element = this.buttonRef.nativeElement;
    const rect = element.getBoundingClientRect();
    const styles = window.getComputedStyle(element);
    const borderRadius = parseFloat(styles.borderRadius) || 0;
    const width = rect.width;
    const height = rect.height;

    this.loadingAnimationProps.buttonWidth = width;
    this.loadingAnimationProps.buttonHeight = height;
    this.loadingAnimationProps.buttonRadius = borderRadius;
    const externalWidth = width + 6;
    const externalHeight = height + 6;
    const externalRadius = borderRadius + 4;
    this.loadingAnimationProps.buttonPerimeter = this.calculatePerimeter(externalWidth, externalHeight, externalRadius);
    this.loadingAnimationProps.glowLength = this.loadingAnimationProps.buttonPerimeter * 0.15;
    element.style.setProperty('--btn-perimeter', `${this.loadingAnimationProps.buttonPerimeter}`);
    this.cdr.detectChanges();
  }

  private calculatePerimeter(width: number, height: number, radius: number): number {
    const clampedRadius = Math.min(radius, width / 2, height / 2);
    const straightWidth = Math.max(0, width - 2 * clampedRadius);
    const straightHeight = Math.max(0, height - 2 * clampedRadius);
    const circleCircumference = 2 * Math.PI * clampedRadius;
    return 2 * straightWidth + 2 * straightHeight + circleCircumference;
  }

  // ====================

  protected onClick(event: MouseEvent): void {
    if (!this.disabled && !this.loading) {
      this.buttonClick.emit(event);
    }
  }

  protected get buttonClasses(): Record<string, boolean> {
    const classes: Record<string, boolean> = {
      btn: true,
      'btn--disabled': this.disabled || this.loading,
      'btn--loading': this.loading,
      [`btn--loading-${this.loadingStyle}`]: this.loading,
      'btn--small': this.size?.small || false,
      'btn--medium': this.size?.medium || false,
      'btn--large': this.size?.large || false,
      'btn--full-width': this.size?.fullWidth || false,
      'btn--icon-only': this.icon?.iconOnly || false,
      'btn--rounded': this.rounded,
      'btn--circle': this.circle,
      'btn--filled': this.fill,
      [`btn--${this.color}`]: true,
    };

    if (this.customClass) {
      this.customClass
        .split(' ')
        .filter((className) => className.length > 0)
        .forEach((className) => {
          if (classes[className]) {
            return;
          }

          classes[className] = true;
        });
    }

    return classes;
  }
}
