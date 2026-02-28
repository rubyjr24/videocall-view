import { Component } from '@angular/core';
import { HeaderService } from '../../../services/header-service';
import { AuthService } from '../../../services/auth-service';
import { Router } from '@angular/router';
import { ToastService } from '../../../services/toast-service';

@Component({
    selector: 'header-component',
    imports: [],
    templateUrl: './header-component.html',
    styleUrl: './header-component.css',
})
export class HeaderComponent {

    constructor(
        private header: HeaderService,
        private auth: AuthService,
        private router: Router,
        private toast: ToastService
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
                this.toast.show("No se ha podido cerrar sesión");
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
                this.toast.show("No se ha podido cerrar sesión");
            }
        })
    }

}
