import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ConfigService } from './config-service';
import { ErrorResponse } from '../interfaces/responses/error-response';
import { RoomResponse } from '../interfaces/responses/room-response';

@Injectable({
    providedIn: 'root',
})
export class VideoCallService {

    constructor(
        private http: HttpClient,
        private config: ConfigService
    ) { }

    createCall(){
        return this.http.post<RoomResponse>(
            `${this.config.apiUrl}/videocall/create`,
            {
                name: "Mi sala",
                emails: [
                    "juan@gmail.com"
                ]
            }
        );
    }

    getCalls(){
        return this.http.get<RoomResponse[]>(
            `${this.config.apiUrl}/videocall`
        );
    }

}
