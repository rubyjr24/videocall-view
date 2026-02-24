import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AppConfig } from '../interfaces/app-config';

@Injectable({
    providedIn: 'root'
})
export class ConfigService {

    private config: AppConfig | undefined;

    constructor(private http: HttpClient) { }

    async loadConfig(): Promise<void> {
        try {
            const data = await firstValueFrom(
                this.http.get<AppConfig>('/assets/config/config.json')
            );
            this.config = data;
        } catch (error) {
            console.error('No se pudo cargar la configuración', error);
        }
    }


    get apiUrl(): string {
        if (!this.config) {
            throw new Error('Configuración no cargada.');
        }
        return this.config.apiUrl;
    }

}
