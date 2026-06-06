import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, signal } from '@angular/core';
import { VideoCallService } from '../../../services/video-call-service';
import { ToastService } from '../../../services/toast-service';
import { Router } from '@angular/router';
import { RoomResponse } from '../../../interfaces/responses/room-response';
import { ErrorResponse } from '../../../interfaces/responses/error-response';
import { HeaderService } from '../../../services/header-service';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserResponse } from '../../../interfaces/responses/user-response';
import { UserService } from '../../../services/user-service';
import { ErrorCodes } from '../../../enums/error-codes';
import { PopupComponent } from "../../common/popup-component/popup-component";
import { RoomRequest } from '../../../interfaces/requests/room-request';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../services/auth-service';
import { TranslocoDirective, TranslocoService } from '@ngneat/transloco';

@Component({
    selector: 'home-page',
    imports: [ReactiveFormsModule, PopupComponent, TranslocoDirective],
    templateUrl: './home-page.html',
    styleUrl: './home-page.css',
})
export class HomePage {

    public calls = signal<RoomResponse[]>([]);
    public invitations = signal<RoomResponse[]>([]);
    public contacts = signal<UserResponse[]>([]);
    public emailInvitations = signal<Set<string>>(new Set());
    formCreateCallPopupEnabled = false;

    private topicSubscriptions: Subscription[] = [];

    userFavoriteForm = new FormGroup(
        {
            email: new FormControl('', {
                nonNullable: true,
                validators: [
                    Validators.required,
                    Validators.maxLength(256),
                    Validators.email,
                    Validators.minLength(1)
                ]
            })
        });

    creationCallForm = new FormGroup(
        {
            name: new FormControl('', {
                nonNullable: true,
                validators: [
                    Validators.required,
                    Validators.maxLength(256),
                    Validators.email,
                    Validators.minLength(1)
                ]
            }),
        });

    invitationForm = new FormGroup(
        {
            email: new FormControl('', {
                nonNullable: true,
                validators: [
                    Validators.required,
                    Validators.maxLength(256),
                    Validators.email,
                    Validators.minLength(1)
                ]
            })
        });

    mostrarContactos: boolean = false;
    emailSearchTerm = signal('');

    filteredContacts = computed(() => {
        const term = (this.emailSearchTerm() || '').toLowerCase();
        if (!term || term === '') return [];
        
        const currentInvitations = this.emailInvitations();
        
        return this.contacts()
            .filter(contact => 
                contact.email.toLowerCase().includes(term) && 
                !currentInvitations.has(contact.email)
            )
            .slice(0, 3);
    });

    enabledSuggestionContacts: boolean = true;

    constructor(
        private videoCall: VideoCallService,
        private toast: ToastService,
        private router: Router,
        private header: HeaderService,
        private user: UserService,
        private auth: AuthService,
        private trasnlocoService: TranslocoService,
    ) { }

    ngOnInit() {
        this.header.show();
        this.getCalls();
        this.getInvitations();
        this.getContacts();

        this.videoCall.getMessagingServiceStatus().subscribe({
            next: (value) => {
                if (!value) this.videoCall.initMessagingService();
            }
        });

        this.initTopics();
    }

    openFormCreationCall() {
        this.formCreateCallPopupEnabled = true;
    }

    onCloseCreationCall(){
        this.resetPopupCreationCall();
    }

    private resetPopupCreationCall(){
        this.emailInvitations.set(new Set());
        this.enabledSuggestionContacts = true;
        this.creationCallForm.controls.name.setValue('');
        this.invitationForm.controls.email.setValue('');
        this.emailSearchTerm.set('');
        this.formCreateCallPopupEnabled = false
    }

    createCall() {

        const data: RoomRequest = {
            name: this.creationCallForm.controls.name.value,
            emails: [...this.emailInvitations()]
        }

        this.videoCall.createCall(data).subscribe({
            next: (room: RoomResponse) => {
                this.formCreateCallPopupEnabled = false;
                this.calls.update(currentCalls => [room, ...currentCalls]);
                this.resetPopupCreationCall();
                this.toast.show(this.trasnlocoService.translate('home.toast.successfulRoomCreation', {
                    name: room.name
                }));
            },
            error: (err: HttpErrorResponse) => {
                const errorData = err.error as ErrorResponse;

                this.toast.show(this.trasnlocoService.translate('home.toast.errorRoomCreation'));
                console.error(errorData)
            }
        });

    }

    private getCalls() {

        this.videoCall.getCalls().subscribe({
            next: (res: RoomResponse[]) => {
                this.calls.set(res);
            },
            error: (err: HttpErrorResponse) => {
                const errorData = err.error as ErrorResponse;

                this.toast.show(this.trasnlocoService.translate('error.toast.errorLoadingOwnCalls'));
                console.error(errorData)
            }
        });
    }

    private getInvitations() {

        this.videoCall.getInvitations().subscribe({
            next: (res: RoomResponse[]) => {
                this.invitations.set(res);
            },
            error: (err: HttpErrorResponse) => {
                const errorData = err.error as ErrorResponse;

                this.toast.show(this.trasnlocoService.translate('home.toast.errorLoadingInvitationCalls'));
                console.error(errorData)
            }
        });
    }

    getContacts() {
        this.videoCall.getContacts().subscribe({
            next: (res: UserResponse[]) => {
                this.contacts.set(res);
            },
            error: (err: HttpErrorResponse) => {
                const errorData = err.error as ErrorResponse;

                this.toast.show(this.trasnlocoService.translate('home.toast.errorLoadingContacts'));
                console.error(errorData)
            }
        });
    }

    deleteCall(roomId: number) {
        this.videoCall.deleteCall(roomId).subscribe({
            next: (room: RoomResponse) => {
                this.calls.update(currentCalls => currentCalls.filter(room => room.roomId !== roomId));
                this.toast.show(this.trasnlocoService.translate('home.toast.successfulRoomDelete', {
                    name: room.name
                }));
            },
            error: (err: HttpErrorResponse) => {
                const errorData = err.error as ErrorResponse;

                this.toast.show(this.trasnlocoService.translate('home.toast.errorDeletingRoom'));
                console.error(errorData)
            }
        });
    }

    onClickInSuggetionContactItem(email: string){
        this.enabledSuggestionContacts = false;
        this.invitationForm.controls.email.setValue(email);
        this.addEmail();
        this.invitationForm.controls.email.setValue('');
    }

    onChangeEmailCreationVideocall(email: string){
        this.emailSearchTerm.set(email);
        this.enabledSuggestionContacts = true;
    }

    private createContact() {

        if (this.userFavoriteForm.getRawValue().email === this.auth.authData()?.email){
            this.toast.show(this.trasnlocoService.translate('home.toast.errorSameEmail'));
            return;
        }

        this.user.createContact(this.userFavoriteForm.getRawValue()).subscribe({
            next: (res: UserResponse) => {
                this.contacts.update(currentContacts => [res, ...currentContacts]);
                this.userFavoriteForm.controls.email.reset();
            },
            error: (err: HttpErrorResponse) => {
                const errorData = err.error as ErrorResponse;

                switch (errorData.code) {
                    case ErrorCodes.USER_NOT_FOUND:
                        this.toast.show(this.trasnlocoService.translate('home.toast.errorEmailNotFound'));
                        break;

                    case ErrorCodes.RESOURCE_ALREADY_EXISTS:
                        this.toast.show(this.trasnlocoService.translate('home.toast.errorContactAlreadyInContacts'));
                        break;

                    default:
                        this.toast.show(this.trasnlocoService.translate('home.toast.errorCreatingContact'));
                        console.error(errorData);
                        break;
                }

            }
        });

    }

    onSubmitUserFavoriteForm() {
        //todo: comprobar que el email no es el mismo que el suyo
        if (this.userFavoriteForm.valid) this.createContact();
    }

    deleteUserFavorite(userFavoriteId: number) {
        this.user.deleteContact(userFavoriteId).subscribe({
            next: () => {
                this.contacts.update(currentContacts => currentContacts.filter(
                    (u) => u.userId != userFavoriteId
                ));
            },
            error: (err: HttpErrorResponse) => {
                const errorData = err.error as ErrorResponse;

                switch (errorData.code) {
                    case ErrorCodes.RESOURCE_NOT_FOUND:
                        this.toast.show(this.trasnlocoService.translate('home.toast.errorContactNotFoundToDelete'));
                        break;

                    default:
                        this.toast.show(this.trasnlocoService.translate('home.toast.errorDeletingContact'));
                        console.error(errorData);
                        break;
                }

            }
        });
    }

    removeEmailFromForm(email: string) {
        this.emailInvitations.update(emails => {
            const newSet = new Set(emails);
            newSet.delete(email);
            return newSet;
        });
    }

    addEmail() {
        if (this.invitationForm.valid) {
            this.emailInvitations.update(emails => {
                const newSet = new Set(emails);
                newSet.add(this.invitationForm.controls.email.value);
                return newSet;
            });
        }
    }

    onClickVideoCall(roomId: number) {
        this.videoCall.roomId = roomId;

        localStorage.setItem('roomId', roomId.toString());

        this.unsubscribeTopics();

        this.router.navigate(['lobby']);
    }

    private initTopics() {

        this.topicSubscriptions.push(
            this.videoCall.onNewCall()!.subscribe({
                next: (invitation: RoomResponse) => {
                    this.invitations.update(invitations => [invitation, ...invitations]);
                    this.toast.show(this.trasnlocoService.translate('home.toast.newInvitation', {
                        name: invitation.name
                    }));
                },
                error: (data) => console.log(data)
            })
        );

        this.topicSubscriptions.push(
            this.videoCall.onDeleteCall()!.subscribe({
                next: (invitationDeleted: RoomResponse) => {
                    this.invitations.update(invitations => invitations.filter(invitation => invitation.roomId !== invitationDeleted.roomId));
                    this.toast.show(this.trasnlocoService.translate('home.toast.ownerDeleteRoom', {
                        name: invitationDeleted.name
                    }));
                },
                error: (data) => console.log(data)
            })
        );


    }

    private unsubscribeTopics() {
        this.topicSubscriptions.forEach(subscription => subscription.unsubscribe());
    }

    ngOnDestroy() {
        this.unsubscribeTopics();
    }

}
