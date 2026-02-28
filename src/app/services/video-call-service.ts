import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ConfigService } from './config-service';
import { RoomResponse } from '../interfaces/responses/room-response';
import { UserResponse } from '../interfaces/responses/user-response';
import { RoomRequest } from '../interfaces/requests/room-request';

@Injectable({
    providedIn: 'root',
})
export class VideoCallService {

    constructor(
        private http: HttpClient,
        private config: ConfigService
    ) { }

    createCall(payload: RoomRequest){
        return this.http.post<RoomResponse>(
            `${this.config.apiUrl}/videocall/create`,
            payload
        );
    }

    getCalls(){
        return this.http.get<RoomResponse[]>(
            `${this.config.apiUrl}/videocall`
        );
    }

    getContacts(){
        return this.http.get<UserResponse[]>(
            `${this.config.apiUrl}/user/contacts`
        );
    }

}
