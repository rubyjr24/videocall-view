import { Component, computed, effect, ElementRef, HostListener, KeyValueDiffers, signal, untracked, ViewChild, WritableSignal } from '@angular/core';
import { AuthService } from '../../../services/auth-service';
import { RxStompService } from '../../../services/messaging/rx-stomp-service';
import { VideoCallService } from '../../../services/video-call-service';
import { SignalMessage } from '../../../interfaces/signal-message';
import { KeyValuePipe } from '@angular/common';
import { SelectorDeviceComponent } from './components/selector-device-component/selector-device-component';
import { Router } from '@angular/router';
import { HeaderService } from '../../../services/header-service';
import { TranslocoDirective } from '@ngneat/transloco';

@Component({
    selector: 'video-call-page',
    imports: [KeyValuePipe, SelectorDeviceComponent, TranslocoDirective],
    templateUrl: './video-call-page.html',
    styleUrl: './video-call-page.css',
})
export class VideoCallPage {

    isMicEnabled = signal<boolean>(true);
    isCamEnabled = signal<boolean>(true);

    private onIsMicEnabledEffect = effect(() =>  {
        console.log("onIsMicEnabledEffect")

        const isEnabled = this.isMicEnabled();
        untracked(() => this.toggleDevice(isEnabled, 'audio'));
        this.sendAudioStatus();
    });
    private onIsCamEnabledEffect = effect(() => {
        console.log("onIsCamEnabledEffect")
        const isEnabled = this.isCamEnabled();
        untracked(() => this.toggleDevice(isEnabled, 'video'));
        this.sendVideoStatus();
    });

    roomId!:number;
    userId!:string;
    userName!: string;

    userNames: WritableSignal<Map<string, string>> = signal(new Map());
    localStream = signal<MediaStream | undefined>(undefined);
    peers: WritableSignal<Map<string, RTCPeerConnection>> = signal(new Map());
    remoteStreams: WritableSignal<Map<string, MediaStream[]>> = signal(new Map());
    usersStreamState: WritableSignal<Map<string, [boolean, boolean]>> = signal(new Map());

    iceConfig: RTCConfiguration = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' }
        ]
    };

    @ViewChild('localVideo', { static: true })
    localVideo?: ElementRef<HTMLVideoElement>;

    @ViewChild('videocallsContainer', { static: false })
    videocallsContainer!: ElementRef<HTMLDivElement>;

    cameras = signal<MediaDeviceInfo[]>([]);
    microphones = signal<MediaDeviceInfo[]>([]);
    speakers = signal<MediaDeviceInfo[]>([]);

    camera = signal<MediaDeviceInfo | null>(null);
    microphone = signal<MediaDeviceInfo | null>(null);
    speaker = signal<MediaDeviceInfo | null>(null);

    private onCameraChangeEffect = effect(() => {
        console.log("onCameraChangeEffect")

        const camara = this.camera();
        const mic = this.microphone();

        untracked(() => {
            this.onCameraOrMicChange(camara?.deviceId, mic?.deviceId);
        });

    });
    private onMicrophoneChangeEffect = effect(() => {
        console.log("onMicrophoneChangeEffect")
        const camara = this.camera();
        const mic = this.microphone();

        untracked(() => {
            this.onCameraOrMicChange(camara?.deviceId, mic?.deviceId);
        });
    });
    private onSpeakerChangeEffect = effect(() => {
        console.log("onSpeakerChangeEffect")
        this.onSpeakerChange()
    });

    //columnsGridVideocallContainer = computed(() => Math.ceil(Math.sqrt(this.peers().size + 1)));

    pendingIceCandidates = new Map<string, RTCIceCandidateInit[]>();

    hiddenSelectAudioDevices:boolean = true;
    hiddenSelectCamDevices:boolean = true;

    toggleSelectAudioDevices(){
        this.hiddenSelectAudioDevices = !this.hiddenSelectAudioDevices;
        this.hiddenSelectCamDevices = true;
    }

    toggleSelectCamDevices(){
        this.hiddenSelectCamDevices = !this.hiddenSelectCamDevices;
        this.hiddenSelectAudioDevices = true;
    }

    onClickMuteMic(){
        if (this.microphone() == null && this.microphones().length == 0) return;
        this.isMicEnabled.set(!this.isMicEnabled());
    }

    
    onClicMuteCam(){
        if (this.camera() == null && this.cameras().length == 0) return;
        this.isCamEnabled.set(!this.isCamEnabled());
    }

    constructor(
        private auth: AuthService,
        private client: RxStompService,
        private videocall: VideoCallService,
        private router: Router,
        private headerService: HeaderService
    ) { }

    async ngOnInit() {
        this.headerService.hide();

        this.client.connect(); // Cambiar e implementar todo dentro de videocall
        this.userId = this.auth.authData()!.userId.toString();
        this.userName = this.auth.authData()!.name;
        this.roomId = this.videocall.roomId ?? parseInt(localStorage.getItem('roomId') ?? "-1");

        if (this.roomId == -1){
            this.onClickLeftButton();
            return;
        }

        await this.loadDevices();
        await this.initMedia();
        this.listenSocket();
        this.joinRoom();
    }

    ngOnDestroy() {
        this.leftRoom();
    }

    @HostListener('window:beforeunload', ['$event'])
    unloadHandler(event: Event) {
        this.leftRoom();
        event.returnValue = true; // compatibilidad
        return true;
    }

    async initMedia() {
        try{
            this.localStream.set(await this.createMediaStream());

            if (!this.localStream()) return;

            const video = this.localVideo?.nativeElement;

            if (video){
                video.srcObject = this.localStream() ?? null;
                video.muted = true; // No funciona
                await video.play();
            }

        }catch(error: any){
            console.log(error)
        }
        
        untracked(() => {
            // Seteamos el estado inicial de los controles
            this.isCamEnabled.set(this.camera() != undefined); 
            this.isMicEnabled.set(this.microphone != undefined);
        });
    }

    private sendName(){
        this.client.publish(`/api/room/${this.roomId}/signal`, {
            type: 'user-name',
            roomId: this.roomId,
            payload: {
                name: this.userName
            }
        });
    }

    joinRoom() {
        this.client.publish(`/api/room/${this.roomId}/signal`, {
            type: 'join',
            roomId: this.roomId,
            payload: {
                name: this.userName
            }
        });
    }

    leftRoom() {
        this.peers().forEach(pc => pc.close());
        this.localStream()?.getTracks().forEach(t => t.stop());

        this.client.publish(`/api/room/${this.roomId}/signal`, {
            type: 'user-left',
            roomId: this.roomId,
        });
    }

    onClickLeftButton(){
        this.leftRoom();
        localStorage.removeItem('roomId');
        this.router.navigate(['/home']);
    }

    listenSocket() {
        this.client.watch(`/app/room/${this.roomId}`).subscribe(async (message: SignalMessage) => {

            if (message.from === this.userId) return;

            this.manageMessage(message);
            
        });

        this.client.watch(`/user/private/call/${this.roomId}/signal`).subscribe(async (message: SignalMessage) => {
            this.manageMessage(message);
        });
    }

    private sendAudioStatus(){
        this.client.publish(`/api/room/${this.roomId}/signal`, {
            type: `${this.isMicEnabled() ? 'user-audio-enabled' : 'user-audio-disabled'}`,
            roomId: this.roomId,
        });
    }

    private sendVideoStatus(){
         this.client.publish(`/api/room/${this.roomId}/signal`, {
            type: `${this.isCamEnabled() ? 'user-video-enabled' : 'user-video-disabled'}`,
            roomId: this.roomId,
        });
    }

    private async manageMessage(message:SignalMessage){

        switch (message.type) {

            case 'join':
                
                this.userNames.update(
                    current => {
                        const map = new Map(current);
                        map.set(message.from, message.payload.name);
                        return map;
                    }
                );

                await this.createPeerConnection(message.from, true);
                this.sendAudioStatus();
                this.sendVideoStatus();
                this.sendName();
                break;

            case 'offer':
                await this.handleOffer(message);
                break;

            case 'answer':
                await this.handleAnswer(message);
                break;

            case 'ice-candidate':
                await this.handleIceCandidate(message);
                break;

            case 'user-left':
                this.userNames.update(
                    current => {
                        const map = new Map(current);
                        map.delete(message.from);
                        return map;
                    }
                );
                this.removePeer(message.from!);
                break;
            
            case 'user-audio-enabled':
                this.usersStreamState.update(
                    current => {
                        const map = new Map(current);
                        const lastValues = map.get(message.from) ?? [false, false];
                        lastValues[0] = true;
                        map.set(message.from, lastValues);
                        return map;
                    }
                );
                break;
            
            case 'user-audio-disabled':
                this.usersStreamState.update(
                    current => {
                        const map = new Map(current);
                        const lastValues = map.get(message.from) ?? [false, false];
                        lastValues[0] = false;
                        map.set(message.from, lastValues);
                        return map;
                    }
                );
                break;
            case 'user-video-enabled':
                this.usersStreamState.update(
                    current => {
                        const map = new Map(current);
                        const lastValues = map.get(message.from) ?? [false, false];
                        lastValues[1] = true;
                        map.set(message.from, lastValues);
                        return map;
                    }
                );
                break;
            case 'user-video-disabled':
                this.usersStreamState.update(
                    current => {
                        const map = new Map(current);
                        const lastValues = map.get(message.from) ?? [false, false];
                        lastValues[1] = false;
                        map.set(message.from, lastValues);
                        return map;
                    }
                );
                break;
            
            case 'user-name':
                this.userNames.update(
                    current => {
                        const map = new Map(current);
                        map.set(message.from, message.payload.name);
                        return map;
                    }
                );
                break;
        }
    }

    async createPeerConnection(remoteUserId: string, isInitiator: boolean) {

        if (this.peers().has(remoteUserId)) return;

        const pc = new RTCPeerConnection(this.iceConfig);

        this.peers.update(
            current => {
                const map = new Map(current);
                map.set(remoteUserId, pc);
                return map;
            }
        );

        if (this.localStream()){
            this.localStream()!.getTracks().forEach(track => {
                pc.addTrack(track, this.localStream()!);
            });
        }

        this.usersStreamState.update(
            current => {
                const map = new Map(current);
                map.set(remoteUserId, [false, false]);
                return map;
            }
        );

        // Cuando llegue stream remoto
        pc.ontrack = (event) => {
            this.remoteStreams.update(current => {
                const map = new Map(current);

                const existingStreams = map.get(remoteUserId) ?? [];

                const newStreams = event.streams.filter(
                    incoming =>
                        !existingStreams.some(existing => existing.id === incoming.id)
                );

                map.set(remoteUserId, [
                    ...existingStreams,
                    ...newStreams
                ]);

                return map;
            });

            this.usersStreamState.update(
                current => {
                    const map = new Map(current);
                    const lastValues = map.get(remoteUserId) ?? [false, false];
                    map.set(remoteUserId, [event.track.kind === 'audio' ? true : lastValues[0], event.track.kind === 'video' ? true : lastValues[1]]);
                    return map;
                }
            );
        };

        // ICE
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                this.client.publish(`/api/room/${this.roomId}/signal`, {
                    type: 'ice-candidate',
                    roomId: this.roomId,
                    payload: {
                        target: remoteUserId,
                        data: event.candidate
                    }
                });
            }
        };

        if (isInitiator) {
            const offer = await pc.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true
            });

            await pc.setLocalDescription(offer);

            this.client.publish(`/api/room/${this.roomId}/signal`, {
                type: 'offer',
                roomId: this.roomId,
                payload:{
                    target: remoteUserId,
                    data: offer
                }
            });
        }

        if (this.videocallsContainer == undefined) return;

        const videocallsContainer = this.videocallsContainer?.nativeElement;
        const videos: NodeListOf<HTMLVideoElement> = videocallsContainer?.querySelectorAll('video') ?? [];

        videos.forEach(async (video: HTMLVideoElement) => {

            if (this.localVideo && video == this.localVideo.nativeElement) return;

            try {
                await video.play()
            } catch (_) {}
        });

    }

    async handleOffer(message: SignalMessage) {

        await this.createPeerConnection(message.from, false);

        const pc = this.peers().get(message.from)!;

        if (pc.signalingState !== 'stable') {
            return;
        }
        
        await pc.setRemoteDescription(new RTCSessionDescription(message.payload.data));

        await this.flushIceCandidates(message.from, pc);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        this.client.publish(`/api/room/${this.roomId}/signal`, {
            type: 'answer',
            roomId: this.roomId,
            payload: {
                target: message.from,
                data: answer
            }
        });
    }

    async handleAnswer(message: SignalMessage) {
        
        const pc = this.peers().get(message.from);
        if (!pc) return;

        if (pc.signalingState === 'stable') {
            console.warn('La conexión ya está estable. Ignorando respuesta duplicada.');
            return;
        }
        
        if (pc.signalingState !== 'have-local-offer') {
            console.error('No se puede aplicar una respuesta si no hay una oferta local previa.');
            return;
        }

        await pc.setRemoteDescription(new RTCSessionDescription(message.payload.data));

        await this.flushIceCandidates(message.from, pc);
    }

    async handleIceCandidate(message: SignalMessage) {
        const pc = this.peers().get(message.from);
        if (!pc) return;

        const candidate = new RTCIceCandidate(message.payload.data);

        // Si ya tenemos la descripción remota, lo añadimos directamente
        if (pc.remoteDescription && pc.signalingState !== 'closed') {
            try {
                await pc.addIceCandidate(candidate);
            } catch (error) {
                console.error("Error al añadir ICE candidate:", error);
            }
        } else {
            // Si no, lo metemos en la cola de espera de este usuario
            const pending = this.pendingIceCandidates.get(message.from) || [];
            pending.push(candidate);
            this.pendingIceCandidates.set(message.from, pending);
        }
    }

    private async flushIceCandidates(userId: string, pc: RTCPeerConnection) {
        const pending = this.pendingIceCandidates.get(userId);
        
        if (pending && pending.length > 0) {
            
            for (const candidate of pending) {
                try {
                    await pc.addIceCandidate(candidate);
                } catch (error) {
                    console.error("Error al procesar ICE candidate en cola:", error);
                }
            }
            // Limpiamos la cola una vez procesados
            this.pendingIceCandidates.delete(userId);
        }
    }

    removePeer(userId: string) {
        const pc = this.peers().get(userId);
        if (pc) {
            pc.close();
            this.peers.update(
                current => {
                    const map = new Map(current);
                    map.delete(userId);
                    return map;
                }
            );
            this.remoteStreams.update(
                current => {
                    const map = new Map(current);
                    map.delete(userId);
                    return map;
                }
            );
            this.usersStreamState.update(
                current => {
                    const map = new Map(current);
                    map.delete(userId);
                    return map;
                }
            );
            this.userNames.update(
                current => {
                    const map = new Map(current);
                    map.delete(userId);
                    return map;
                }
            );
        }

        this.pendingIceCandidates.delete(userId);
    }


    async loadDevices() {

        let streamRequest;

        try{
            streamRequest = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: true
            });

        }catch(_){
            try{
                streamRequest = await navigator.mediaDevices.getUserMedia({
                    audio: true,
                    video: false
                });

            }catch(_){

                try{
                    streamRequest = await navigator.mediaDevices.getUserMedia({
                        audio: false,
                        video: true
                    });

                }catch(_){
                    console.log("NO tiene dispositivos");
                    this.isCamEnabled.set(false);
                    this.isMicEnabled.set(false);
                    return;                
                }
            }
            
        }

        streamRequest.getTracks().forEach(track => track.stop());

        const devices = await navigator.mediaDevices.enumerateDevices();
        
        this.cameras.set(devices.filter(d => d.kind === 'videoinput'));
        this.microphones.set(devices.filter(d => d.kind === 'audioinput'));
        this.speakers.set(devices.filter(d => d.kind === 'audiooutput'));

        this.cameras().forEach(device => {
            if (device.deviceId === 'default') this.camera.set(device);
        });

        this.microphones().forEach(device => {
            if (device.deviceId === 'default') this.microphone.set(device);
        });

        this.speakers().forEach(device => {
            if (device.deviceId === 'default') this.speaker.set(device);
        });

        if (this.camera() == undefined && this.cameras().length > 0) this.camera.set(this.cameras()[0]);
        if (this.microphone() == undefined && this.microphones().length > 0) this.microphone.set(this.microphones()[0]);
        if (this.speaker() == undefined && this.speakers().length > 0) this.speaker.set(this.speakers()[0]);
    }


    async onCameraOrMicChange(camaraId?: string, microponeId?:string) {

        this.localStream()?.getTracks().forEach(track => track.stop());
        
        this.localStream.set(await this.createMediaStreamWithIds(camaraId, microponeId));
        if (!this.localStream()) return;

        if (this.localVideo){
            this.localVideo.nativeElement.srcObject = this.localStream() ?? null;
        }

        this.localStream()?.getTracks().forEach(track => {
            this.updatePeerTrack(track);
        });
        
    }

    async onSpeakerChange() {

        if (this.speaker() == undefined || this.videocallsContainer == undefined) return;

        const videocallsContainer = this.videocallsContainer.nativeElement;
        const videos: NodeListOf<HTMLVideoElement> = videocallsContainer.querySelectorAll('video');

        videos.forEach(async (video: HTMLVideoElement) => {

            if (this.localVideo && video == this.localVideo.nativeElement){
                video.muted = true;
                video.volume = 0;
                video.play();
                return;
            }

            try {
                await video.setSinkId(this.speaker()!.deviceId);
                await video.play();
            } catch (_) {}
        });
        
    }

    updatePeerTrack(newTrack: MediaStreamTrack) {
        
        this.peers().forEach(pc => {
            
            const sender = pc.getSenders().find(s => 
                s.track && s.track.kind === newTrack.kind
            );

            if (sender) {
                sender.replaceTrack(newTrack)
            }

        });
        
    }

    async toggleDevice(isEnabled: boolean, deviceType: 'video' | 'audio'){

        this.peers().forEach(async pc => {

            const sender = pc.getSenders().find(sender => sender.track?.kind === deviceType);
            
            if (sender == undefined) return;

            if (isEnabled){

                this.localStream()?.getTracks().filter((t) => t.kind === deviceType).forEach((t) => t.stop());

                this.localStream.set(await this.createMediaStream());
                if (!this.localStream()) return;

                this.localStream()!.getTracks().forEach((track) => {
                    this.updatePeerTrack(track);
                });
            
            }else{
                if (sender.track) sender.track.enabled = false;
                sender.track?.stop();
            }

        });

    }

    async createMediaStream(){
        return this.createMediaStreamWithIds(this.camera()?.deviceId, this.microphone()?.deviceId);
    }

    async createMediaStreamWithIds(camaraId?: string, microponeId?:string){
        const constraints: MediaStreamConstraints = {
            video: camaraId ? { deviceId: { exact: camaraId }, width: { ideal: 1280 } } : false,
            audio: microponeId ? { deviceId: { exact: microponeId } } : true
        };

        try {
            return await navigator.mediaDevices.getUserMedia(constraints);
        }catch(_){
            return undefined;
        }
    }

}
