import { Routes } from '@angular/router';
import { LoginPage } from './components/page/login-page/login-page';
import { HomePage } from './components/page/home-page/home-page';
import { VideoCallPage } from './components/page/video-call-page/video-call-page';
import { authGuard } from './guards/auth-guard';

export const routes: Routes = [
  { 
    path: 'login', 
    component: LoginPage
  },
  { 
    path: 'home', 
    component: HomePage ,
    canActivate: [authGuard]
  },
  { 
    path: 'videocall', 
    component: VideoCallPage,
    canActivate: [authGuard]
  },
  { 
    path: '', 
    redirectTo: 'home', 
    pathMatch: 'full' 
  },
  { 
    path: '**', 
    redirectTo: 'home' 
  }
];