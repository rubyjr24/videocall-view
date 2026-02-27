import { Injectable, signal } from '@angular/core';

@Injectable({
    providedIn: 'root',
})
export class HeaderService {

    isVisible = signal(false);

    show() { this.isVisible.set(true); }
    hide() { this.isVisible.set(false); }

}
