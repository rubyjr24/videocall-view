import { Routes } from '@angular/router';
import { LoginPage } from './components/page/login-page/login-page';
import { HomePage } from './components/page/home-page/home-page';
import { VideoCallPage } from './components/page/video-call-page/video-call-page';

export const routes: Routes = [
  { 
    path: 'login', 
    component: LoginPage
  },
  { 
    path: 'home', 
    component: HomePage 
  },
  { 
    path: 'videocall', 
    component: VideoCallPage 
  },
  // Ruta por defecto (redirige al login si el path está vacío)
  { 
    path: '', 
    redirectTo: 'login', 
    pathMatch: 'full' 
  },
  // Comodín para manejar errores 404 (opcional)
  { 
    path: '**', 
    redirectTo: 'login' 
  }
];