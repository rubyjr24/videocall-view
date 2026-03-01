import { Component } from '@angular/core';

@Component({
    selector: 'video-call-page',
    imports: [],
    templateUrl: './video-call-page.html',
    styleUrl: './video-call-page.css',
})
export class VideoCallPage {

    isMicEnabled: boolean = true;
    isCamEnabled: boolean = true;

}
