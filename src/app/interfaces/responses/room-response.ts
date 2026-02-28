import { UserResponse } from "./user-response";

export interface RoomResponse {
    roomId: number;
    name: string;
    userInvitations: UserResponse[];
}
