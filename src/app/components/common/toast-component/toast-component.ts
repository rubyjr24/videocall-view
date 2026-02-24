import { Component } from '@angular/core';
import { ToastService } from '../../../services/toast-service';
import { NgClass } from '@angular/common';

@Component({
	selector: 'toast-component',
	imports: [NgClass],
	templateUrl: './toast-component.html',
	styleUrl: './toast-component.css',
})
export class ToastComponent {

	constructor(public toastService: ToastService){}

}
