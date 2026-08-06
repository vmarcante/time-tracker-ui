import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RegisterApiService } from '../../../services/api/register.api.service';
import { ApiAdapterService } from '../../../../../shared/services/api/api-adapter.service';
import { TranslatePipe } from '../../../../../shared/pipes/translate.pipe';
import { LoadingComponent } from '../../../../../shared/components/loading/loading.component';
import { ButtonComponent } from '../../../../../shared/components/button/button.component';

@Component({
  selector: 'app-register-confirmation',
  imports: [CommonModule, LoadingComponent, ButtonComponent, TranslatePipe],
  templateUrl: './register-confirmation.component.html',
  styleUrls: ['./register-confirmation.component.scss'],
})
export class RegisterConfirmationComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private registerApiService = inject(RegisterApiService);
  private apiService = inject(ApiAdapterService);

  status: 'loading' | 'success' | 'error' = 'loading';
  errorMessage = '';
  countdown = 5;

  ngOnInit(): void {
    this.route.params.subscribe((params) => {
      const token = params['token'];

      if (!token) {
        this.status = 'error';
        this.errorMessage = 'user.access.token.required';
        return;
      }

      setTimeout(() => {
        this.confirmRegistration(token);
      }, 50);
    });
  }

  private confirmRegistration(token: string): void {
    const request = this.registerApiService.confirmRegistration({ accessToken: token });
    this.apiService.executeRequest(request, {
      ignoreLoading: true,
      onSuccess: () => {
        this.status = 'success';
        this.cdr.detectChanges();
        this.startCountdown();
      },
      onError: (error) => {
        this.status = 'error';
        this.errorMessage = error.error?.data?.message ?? 'user.access.token.invalid';
        this.cdr.detectChanges();
      },
    });
  }

  private startCountdown(): void {
    const interval = setInterval(() => {
      this.countdown--;
      this.cdr.detectChanges();

      if (this.countdown === 0) {
        clearInterval(interval);
        this.router.navigate(['/']);
      }
    }, 1000);
  }

  goToLogin(): void {
    this.router.navigate(['/']);
  }
}
