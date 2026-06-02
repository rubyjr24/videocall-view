export interface LoginResponse {
    userId: number,
    email: string,
    token: string,
    expiresAt: Date
}
