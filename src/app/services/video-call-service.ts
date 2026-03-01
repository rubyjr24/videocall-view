import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ConfigService } from './config-service';
import { RoomResponse } from '../interfaces/responses/room-response';
import { UserResponse } from '../interfaces/responses/user-response';
import { RoomRequest } from '../interfaces/requests/room-request';
import { IMessagingService } from '../interfaces/imessaging-service';
import { MessagingFactory } from './messaging/messaging-factory';
import { AuthService } from './auth-service';
import { map, Observable, of } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class VideoCallService {

    private _roomId?: number;
    private client?: IMessagingService;
    
    constructor(
        private http: HttpClient,
        private auth: AuthService,
        private config: ConfigService
    ) {}

    get topics(){
        return this.client?.getTopics();
    }

    get roomId(): number | undefined {
        return this._roomId;
    }

    set roomId(value: number) {
        this._roomId = value;
    }

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

    getInvitations(){
        return this.http.get<RoomResponse[]>(
            `${this.config.apiUrl}/videocall/invitations`
        );
    }

    deleteCall(roomId:number){
        return this.http.delete<RoomResponse>(
            `${this.config.apiUrl}/videocall/${roomId}`
        );
    }

    joinCall(){
        return this.http.get<RoomResponse>(
            `${this.config.apiUrl}/videocall/${this.roomId}/join`
        );
    }

    getContacts(){
        return this.http.get<UserResponse[]>(
            `${this.config.apiUrl}/user/contacts`
        );
    }

    initMessagingService(){
        this.client = MessagingFactory.create('stomp', this.auth, this.config);
        this.client.connect();
    }

    getMessagingServiceStatus(): Observable<boolean>{
        return this.client?.connectionStatus() ?? of(false);
    }

    onNewCall(){
        return this.client?.watch('/user/private/call/new');
    }

    onDeleteCall(){
        return this.client?.watch('/user/private/call/delete');
    }

    onNewParticipant(roomId:number){
        return this.client?.watch(`/app/call/${roomId}/new/participant`);
    }

}
