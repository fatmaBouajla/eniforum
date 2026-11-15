import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  form: FormGroup;
  loading = false;
  error = '';
  showPassword = false;

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {
    this.form = this.fb.group({
      email:      ['', [Validators.required, Validators.email]],
      motDePasse: ['', Validators.required],
    });
    if (this.auth.getToken()) this.auth.redirectByRole();
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading = true; this.error = '';
    this.auth.login(this.form.value).subscribe({
      next: () => this.auth.redirectByRole(),
      error: (e: Error) => {
        // Message précis pour un compte désactivé, générique sinon
        this.error = e.message.includes('désactivé') ? e.message : 'Email ou mot de passe incorrect.';
        this.loading = false;
      },
    });
  }

  get f() { return this.form.controls; }
}
