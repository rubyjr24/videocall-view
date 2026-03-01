import { Observable } from "rxjs";

export interface IMessagingService {
    connect(): void;
    disconnect(): void;
    watch(topic: string): Observable<any>;
    publish(topic: string, body: any): void;
    connectionStatus(): Observable<boolean>;
    getTopics(): Set<string>;
}
