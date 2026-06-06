export interface LoginResponse {
    userId: number,
    email: string,
    name: string,
    token: string,
    expiresAt: Date
}
