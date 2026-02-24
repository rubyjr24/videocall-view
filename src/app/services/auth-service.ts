import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ConfigService } from './config-service';
import { Observable } from 'rxjs';
import { LoginRequest } from '../interfaces/login-request';
import { LoginResponse } from '../interfaces/login-response';
import { SignUpRequest } from '../interfaces/sign-up-request';

@Injectable({
	providedIn: 'root',
})
export class AuthService {

	constructor(
		private http: HttpClient,
		private config: ConfigService
	) { }

	login(payload: LoginRequest) : Observable<LoginResponse> {
		return this.http.post<LoginResponse>(
			`${this.config.apiUrl}/auth/login`,
			payload
		);
	}

	signUp(payload: SignUpRequest) : Observable<LoginResponse> {
		return this.http.post<LoginResponse>(
			`${this.config.apiUrl}/auth/sign-up`,
			payload
		);
	}

}
