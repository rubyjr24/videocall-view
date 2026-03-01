import { Injectable } from '@angular/core';
import { RxStomp, RxStompConfig, RxStompState } from '@stomp/rx-stomp';
import { IMessagingService } from '../../interfaces/imessaging-service';
import { map, Observable } from 'rxjs';
import { ConfigService } from '../config-service';
import { AuthService } from '../auth-service';

@Injectable({
    providedIn: 'root',
})
export class RxStompService implements IMessagingService {

    private rxStomp: RxStomp;
    private rxStompConfig: RxStompConfig;
    
    public readonly topics: Set<string> = new Set();

    constructor(
        private config: ConfigService,
        private auth: AuthService
    ) {

        this.rxStompConfig = {
            brokerURL: `${this.config.websocketApiUrl}/ws`,
            heartbeatIncoming: 0,
            heartbeatOutgoing: 20000,
            reconnectDelay: 5000,
            connectHeaders: {
                Authorization: `Bearer ${this.auth.authData()?.token}`
            },
            debug: (msg: string): void => {
                console.log(new Date(), msg);
            },
        };

        this.rxStomp = new RxStomp();
    }

    connect(): void {
        this.rxStomp.configure(this.rxStompConfig);
        this.rxStomp.activate();
    }

    disconnect(): void {
        this.rxStomp.deactivate();
    }

    watch(topic: string): Observable<any> {
        this.topics.add(topic);
        console.log("TOPIC: " +topic )
        return this.rxStomp.watch(topic).pipe(
            map(message => {
                console.log("asdasdasdsa")
                return JSON.parse(message.body)
            })
        );
    }

    publish(topic: string, body: any): void {
        this.rxStomp.publish({ destination: topic, body: JSON.stringify(body) });
    }

    connectionStatus(): Observable<boolean> {
        return this.rxStomp.connectionState$.pipe(
            map(state => state === RxStompState.OPEN)
        );
    }

    getTopics(): Set<string> {
        return new Set(...this.topics.values());
    }

}
