import { Injectable, signal } from '@angular/core';

export interface Toast {
    id: number;
    message: string;
    showing: boolean;
}

@Injectable({
    providedIn: 'root',
})
export class ToastService {

    toasts = signal<Toast[]>([]);

    show(message: string, time: number = 3000) {
        const id = Date.now();
        const toast = { id, message, showing: true};
        this.toasts.update(t => [...t, toast]);

        setTimeout(() => this.updateShowing(id, false), 250);

        setTimeout(() => this.remove(id), time);
    }

    remove(id: number) {
        this.updateShowing(id, true)
        setTimeout(() => {
            this.toasts.update(t => t.filter(x => x.id !== id));
        }, 250);
        
    }

    updateShowing(id: number, showing: boolean){
        this.toasts.update(toasts => {
            toasts.forEach(toast => {
                if (toast.id === id) toast.showing = showing
            });
            return [...toasts];
        });
    }

}
