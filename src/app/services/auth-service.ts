import { HttpClient } from '@angular/common/http';
import { computed, Injectable, signal } from '@angular/core';
import { ConfigService } from './config-service';
import { Observable, tap } from 'rxjs';
import { LoginRequest } from '../interfaces/login-request';
import { LoginResponse } from '../interfaces/login-response';
import { SignUpRequest } from '../interfaces/sign-up-request';

@Injectable({
	providedIn: 'root',
})
export class AuthService {

	private _authState = signal<LoginResponse | null>(this.getAuthFromStorage());
	public authData = this._authState.asReadonly();
	public isAuthenticated = computed(() => !!this._authState());

	constructor(
		private http: HttpClient,
		private config: ConfigService
	) {
		const auth = this.getAuthFromStorage();
		this._authState.set(auth != null && this.isAuthValid(auth) ? auth : null);
	}

	login(payload: LoginRequest) : Observable<LoginResponse> {
		return this.http.post<LoginResponse>(
			`${this.config.apiUrl}/auth/login`,
			payload
		).pipe(
            tap((auth) => {
                if (this.isAuthValid(auth)) this._authState.set(auth);
            })
        );
	}

	signUp(payload: SignUpRequest) : Observable<LoginResponse> {
		return this.http.post<LoginResponse>(
			`${this.config.apiUrl}/auth/sign-up`,
			payload
		).pipe(
            tap((auth) => {
                if (this.isAuthValid(auth)) this._authState.set(auth);
            })
        );
	}

	private getAuthFromStorage(): LoginResponse | null {
        const data = localStorage.getItem('auth');
        try {
            return data ? JSON.parse(data) : null;
        } catch {
            return null;
        }
    }

	private isAuthValid(auth: LoginResponse): boolean{
		const date = new Date(auth.expiresAt);
		return date.getTime() > new Date().getTime();
	}

}
