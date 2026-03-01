import { Routes } from '@angular/router';
import { LoginPage } from './components/pages/login-page/login-page';
import { HomePage } from './components/pages/home-page/home-page';
import { VideoCallPage } from './components/pages/video-call-page/video-call-page';
import { authGuard } from './guards/auth-guard';
import { VideoCallLobbyPage } from './components/pages/video-call-lobby-page/video-call-lobby-page';

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
    path: 'lobby', 
    component: VideoCallLobbyPage,
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