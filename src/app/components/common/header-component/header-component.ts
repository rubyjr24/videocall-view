import { Component } from '@angular/core';
import { HeaderService } from '../../../services/header-service';
import { AuthService } from '../../../services/auth-service';
import { Router } from '@angular/router';
import { ToastService } from '../../../services/toast-service';
import { TranslocoDirective, TranslocoService } from '@ngneat/transloco';

@Component({
    selector: 'header-component',
    imports: [TranslocoDirective],
    templateUrl: './header-component.html',
    styleUrl: './header-component.css',
})
export class HeaderComponent {

    constructor(
        private header: HeaderService,
        private auth: AuthService,
        private router: Router,
        private toast: ToastService,
        private translocoService: TranslocoService
    ){}

    isHeaderEnabled() : boolean{
        return this.header.isVisible();
    }

    logout(): void{
        this.auth.logout().subscribe({
            next: () => {
                this.header.hide();
                this.router.navigate(['login']);
            },
            error: () => {
                this.toast.show(this.translocoService.translate('header.toast.errorSignOut'));
            }
        })
    }

    deleteAccount(): void{
        this.auth.deleteAccount().subscribe({
            next: () => {
                this.header.hide();
                this.router.navigate(['login']);
            },
            error: () => {
                this.toast.show(this.translocoService.translate('header.toast.errorDeleteAccount'));
            }
        })
    }

}
