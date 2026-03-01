import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, signal } from '@angular/core';
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

@Component({
    selector: 'home-page',
    imports: [ReactiveFormsModule, PopupComponent],
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
                    Validators.email
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
                    Validators.email
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
                    Validators.email
                ]
            })
        });

    constructor(
        private videoCall: VideoCallService,
        private toast: ToastService,
        private router: Router,
        private header: HeaderService,
        private user: UserService,
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

    createCall() {

        const data: RoomRequest = {
            name: this.creationCallForm.controls.name.value,
            emails: [...this.emailInvitations()]
        }

        this.videoCall.createCall(data).subscribe({
            next: (room: RoomResponse) => {
                this.formCreateCallPopupEnabled = false;
                this.calls.update(currentCalls => [room, ...currentCalls]);
                this.toast.show(`Se ha creado correctamente la sala ${room.name}`);
            },
            error: (err: HttpErrorResponse) => {
                const errorData = err.error as ErrorResponse;

                this.toast.show("Ha ocurrido un error y no se ha podido crear la videoconferencias");
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

                this.toast.show("Ha ocurrido un error y no se ha podido cargar las videoconferencias");
                console.error(errorData)
            }
        });
    }

    private getInvitations() {

        this.videoCall.getInvitations().subscribe({
            next: (res: RoomResponse[]) => {
                console.log(res)
                this.invitations.set(res);
            },
            error: (err: HttpErrorResponse) => {
                const errorData = err.error as ErrorResponse;

                this.toast.show("Ha ocurrido un error y no se ha podido cargar las invitaciones de las videoconferencias");
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

                this.toast.show("Ha ocurrido un error y no se ha podido cargar los contactos");
                console.error(errorData)
            }
        });
    }

    deleteCall(roomId: number) {
        this.videoCall.deleteCall(roomId).subscribe({
            next: (room: RoomResponse) => {
                this.calls.update(currentCalls => currentCalls.filter(room => room.roomId !== roomId));
                this.toast.show(`Se ha eliminado la sala ${room.name} correctamente`);
            },
            error: (err: HttpErrorResponse) => {
                const errorData = err.error as ErrorResponse;

                this.toast.show("Ha ocurrido un error y no se ha podido eliminar la sala");
                console.error(errorData)
            }
        });
    }

    private createContact() {
        this.user.createContact(this.userFavoriteForm.getRawValue()).subscribe({
            next: (res: UserResponse) => {
                this.contacts.update(currentContacts => [res, ...currentContacts]);
                this.userFavoriteForm.controls.email.reset();
            },
            error: (err: HttpErrorResponse) => {
                const errorData = err.error as ErrorResponse;

                switch (errorData.code) {
                    case ErrorCodes.USER_NOT_FOUND:
                        this.toast.show("El email que ha introducido no pertenece a ningun usuario");
                        break;

                    case ErrorCodes.RESOURCE_ALREADY_EXISTS:
                        this.toast.show("El contacto no ha sido creado porque ya lo tenia previamente en su lista de contactos");
                        break;

                    default:
                        this.toast.show("Ha ocurrido un error y no se ha podido crear el contacto");
                        console.error(errorData);
                        break;
                }

            }
        });

    }

    onSubmitUserFavoriteForm() {
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
                        this.toast.show("El contacto que intenta borrar no existe");
                        break;

                    default:
                        this.toast.show("Ha ocurrido un error y no se ha podido eliminar el contacto");
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

        this.unsubscribeTopics();

        this.router.navigate(['lobby']);
    }

    private initTopics() {

        this.topicSubscriptions.push(
            this.videoCall.onNewCall()!.subscribe({
                next: (invitation: RoomResponse) => {
                    this.invitations.update(invitations => [invitation, ...invitations]);
                    this.toast.show(`Se ha añadido una invitación a la videoconferencia ${invitation.name}`);
                },
                error: (data) => console.log(data)
            })
        );

        this.topicSubscriptions.push(
            this.videoCall.onDeleteCall()!.subscribe({
                next: (invitationDeleted: RoomResponse) => {
                    this.invitations.update(invitations => invitations.filter(invitation => invitation.roomId !== invitationDeleted.roomId));
                    this.toast.show(`El usuario propietario, ha eliminado la sala ${invitationDeleted.name}`);
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
