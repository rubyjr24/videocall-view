import { Component } from '@angular/core';
import { HeaderService } from '../../../services/header-service';
import { AuthService } from '../../../services/auth-service';
import { Router } from '@angular/router';

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
        private router: Router
    ){}

    isHeaderEnabled() : boolean{
        return this.header.isVisible();
    }

    logout(): void{
        this.auth.logout();
        this.header.hide();
        this.router.navigate(['login']);
    }

}
