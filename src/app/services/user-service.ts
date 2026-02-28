import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ConfigService } from './config-service';
import { UserResponse } from '../interfaces/responses/user-response';
import { ContactRequest } from '../interfaces/requests/contact-request';

@Injectable({
    providedIn: 'root',
})
export class UserService {

    constructor(
        private http: HttpClient,
        private config: ConfigService
    ) { }

    createContact(payload: ContactRequest){
        return this.http.post<UserResponse>(
            `${this.config.apiUrl}/user/contact`,
            payload
        );
    }

    deleteContact(userFavoriteId:number){
        return this.http.delete(
            `${this.config.apiUrl}/user/contact/${userFavoriteId}`
        );
    }

}
