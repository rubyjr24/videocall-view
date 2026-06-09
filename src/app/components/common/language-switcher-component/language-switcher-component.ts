import { NgClass } from '@angular/common';
import { Component, Input } from '@angular/core';
import { TranslocoService } from '@ngneat/transloco';

@Component({
    selector: 'app-language-switcher',
    templateUrl: './language-switcher-component.html',
    standalone: true,
    styleUrl: './language-switcher-component.css',
    imports: [NgClass],
})
export class LanguageSwitcherComponent {

    @Input() disableIcon = false;
    @Input() textColorLight = false;

    constructor(
        private translocoService: TranslocoService
    ) { }

    availableLanguages = [
        { id: 'es', label: 'Español' },
        { id: 'en', label: 'English' }
    ];

    activeLang() {
        return this.translocoService.getActiveLang();
    }

    changeLanguage(event: Event) {
        const target = event.target as HTMLSelectElement;
        this.translocoService.setActiveLang(target.value);
    }
}