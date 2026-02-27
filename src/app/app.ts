import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from "./components/common/toast-component/toast-component";
import { HeaderComponent } from "./components/common/header-component/header-component";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastComponent, HeaderComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('videocall-view');
}
