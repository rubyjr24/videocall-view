import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, signal } from '@angular/core';
import { VideoCallService } from '../../../services/video-call-service';
import { ToastService } from '../../../services/toast-service';
import { Router } from '@angular/router';
import { RoomResponse } from '../../../interfaces/responses/room-response';
import { ErrorResponse } from '../../../interfaces/responses/error-response';
import { HeaderService } from '../../../services/header-service';

@Component({
    selector: 'home-page',
    imports: [],
    templateUrl: './home-page.html',
    styleUrl: './home-page.css',
})
export class HomePage {

    public calls = signal<RoomResponse[]>([]);

    constructor(
        private videoCall: VideoCallService,
        private toast: ToastService,
        private router: Router,
        private header: HeaderService
    ){}

    ngOnInit(){
        this.header.show();
        this.getCalls();
    }

    createCall(){

        this.videoCall.createCall().subscribe({
            next: (res: RoomResponse) => {
                this.calls.update(currentCalls => [res, ...currentCalls]);
                console.log(res)
            },
            error: (err: HttpErrorResponse) => {
                const errorData = err.error as ErrorResponse;

                this.toast.show("error");
                console.error(errorData)
            }
        });
    }

    private getCalls(){

        this.videoCall.getCalls().subscribe({
            next: (res: RoomResponse[]) => {
                this.calls.set(res);
                console.log(res)
            },
            error: (err: HttpErrorResponse) => {
                const errorData = err.error as ErrorResponse;

                this.toast.show("error");
                console.error(errorData)
            }
        });
    }

}
