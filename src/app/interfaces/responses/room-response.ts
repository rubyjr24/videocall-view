import { UserResponse } from "./user-response";

export interface RoomResponse {
    roomId: Number;
    name: string;
    userInvitations: UserResponse[];
}
