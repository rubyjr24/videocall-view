export interface SignalMessage {
    type: string;
    roomId: number;
    from: string;
    to?: string;
    payload?: any;
}