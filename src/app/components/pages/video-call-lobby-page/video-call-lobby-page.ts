import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { VideoCallService } from '../../../services/video-call-service';
import { HeaderService } from '../../../services/header-service';

@Component({
    selector: 'video-call-lobby-page',
    imports: [],
    templateUrl: './video-call-lobby-page.html',
    styleUrl: './video-call-lobby-page.css',
})
export class VideoCallLobbyPage {

    constructor(
        private router: Router,
        private videocall: VideoCallService,
        private headerService: HeaderService
    ){}

    ngOnInit(){

        this.headerService.hide();

        this.videocall.getMessagingServiceStatus().subscribe({
            next: (value) => {
                if (!value) this.videocall.initMessagingService();
            }
        });

        this.videocall.onNewParticipant(this.videocall.roomId!)?.subscribe({
            next: (data) => console.log(`Join websocket: ${data}`),
            error: (error) => console.error(error)
        })

    }

    enterVideoCall(){

        this.videocall.joinCall().subscribe({
            next: (data) => this.router.navigate(['videocall']),
            error: (error) => console.error(error)
        })

    }

}
