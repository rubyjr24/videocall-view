import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth-service';
import { LoginResponse } from '../../../interfaces/login-response';
import { ToastService } from '../../../services/toast-service';

@Component({
    selector: 'login-page',
    imports: [ReactiveFormsModule],
    templateUrl: './login-page.html',
    styleUrl: './login-page.css',
})
export class LoginPage {

    isLogin: boolean = true;

    loginForm = new FormGroup(
        {
            email: new FormControl('', {
                nonNullable: true,
                validators: [
                    Validators.required,
                    Validators.maxLength(256),
                    Validators.email
                ]
            }),
            password: new FormControl('', {
                nonNullable: true,
                validators: [
                    Validators.required,
                    Validators.maxLength(256), // Aqui da igual lo que ponga, el hash siempre va ha tener el mismo tamaño
                ]
            })
        });

    signUpForm = new FormGroup(
        {

            name: new FormControl('', {
                nonNullable: true,
                validators: [
                    Validators.required,
                    Validators.maxLength(50),
                ]
            }),
            email: new FormControl('', {
                nonNullable: true,
                validators: [
                    Validators.required,
                    Validators.maxLength(256),
                    Validators.email
                ]
            }),
            password: new FormControl('', {
                nonNullable: true,
                validators: [
                    Validators.required,
                    Validators.maxLength(256), // Aqui da igual lo que ponga, el hash siempre va ha tener el mismo tamaño
                ]
            }),
        });

    constructor(
        private router: Router,
        private auth: AuthService,
        private toast: ToastService
    ) { }

    toggleLogin() {
        this.isLogin = !this.isLogin;
    }

    onSubmit() {

        if (this.isLogin) {
            this.signIn();
        } else {
            this.signUp();
        }

    }

    signIn() {
        if (this.loginForm.valid) {
            this.auth.login(this.loginForm.getRawValue()).subscribe({
                next: (res: LoginResponse) => {
                    localStorage.setItem('auth', JSON.stringify(res));
                    this.router.navigate(['/home']);
                },
                error: (err) => {
                    this.toast.show("El usuario o la contraseña son incorrectas");
                }
            });
        }
    }

    signUp() {
        if (this.signUpForm.valid) {
            this.auth.signUp(this.signUpForm.getRawValue()).subscribe({
                next: (res: LoginResponse) => {
                    localStorage.setItem('auth', JSON.stringify(res));
                    this.router.navigate(['/home']);
                },
                error: (err) => {
                    this.toast.show("No se ha podido crear el usuario correctamente");
                }
            });
        }
    }

}
