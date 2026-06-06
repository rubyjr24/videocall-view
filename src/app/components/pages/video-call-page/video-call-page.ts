import { Component, computed, effect, ElementRef, HostListener, KeyValueDiffers, signal, untracked, ViewChild, WritableSignal } from '@angular/core';
import { AuthService } from '../../../services/auth-service';
import { RxStompService } from '../../../services/messaging/rx-stomp-service';
import { VideoCallService } from '../../../services/video-call-service';
import { SignalMessage } from '../../../interfaces/signal-message';
import { KeyValuePipe, NgStyle } from '@angular/common';
import { SelectorDeviceComponent } from './components/selector-device-component/selector-device-component';
import { Router } from '@angular/router';
import { HeaderService } from '../../../services/header-service';
import { TranslocoDirective } from '@ngneat/transloco';

@Component({
    selector: 'video-call-page',
    imports: [KeyValuePipe, SelectorDeviceComponent, NgStyle, TranslocoDirective],
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
    });
    private onIsCamEnabledEffect = effect(() => {
        console.log("onIsCamEnabledEffect")
        const isEnabled = this.isCamEnabled();
        untracked(() => this.toggleDevice(isEnabled, 'video'));
    });

    roomId!:number;
    userId!:string;
    userName!: string;

    userNames: Map<string, string> = new Map();
    localStream = signal<MediaStream | undefined>(undefined);
    peers: WritableSignal<Map<string, RTCPeerConnection>> = signal(new Map());
    remoteStreams: WritableSignal<Map<string, MediaStream[]>> = signal(new Map());

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

    columnsGridVideocallContainer = computed(() => Math.ceil(Math.sqrt(this.peers().size + 1)));

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
        console.log(this.userName)
        this.roomId = this.videocall.roomId!;
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
        event.returnValue = false; 
        return false;
    }


    // =============================
    // 1️⃣ Obtener cámara/micrófono
    // =============================
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

    // =============================
    // 2️⃣ Unirse a la sala
    // =============================
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
        this.router.navigate(['/home']);
    }

    // =============================
    // 3️⃣ Escuchar señalización
    // =============================
    listenSocket() {
        this.client.watch(`/app/room/${this.roomId}`).subscribe(async (message: SignalMessage) => {

            if (message.from === this.userId) return;

            this.manageMessage(message);
            
        });

        this.client.watch(`/user/private/call/${this.roomId}/signal`).subscribe(async (message: SignalMessage) => {
            this.manageMessage(message);
        });
    }

    private async manageMessage(message:SignalMessage){

        switch (message.type) {

            case 'join':
                this.userNames.set(message.from, message.payload.name);
                await this.createPeerConnection(message.from, true);
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
                this.userNames.delete(message.from);
                this.removePeer(message.from!);
                break;
        }
    }

    // =============================
    // 4️⃣ Crear conexión
    // =============================
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


        // todo: mejorar
        // poner video 100x100 width y height
        // cuando se cierra la pagina enviar petición de cierre de sesión

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

    // =============================
    // 5️⃣ Manejar OFFER
    // =============================
    async handleOffer(message: SignalMessage) {

        await this.createPeerConnection(message.from, false);

        const pc = this.peers().get(message.from)!;
        
        await pc.setRemoteDescription(new RTCSessionDescription(message.payload.data));

        await this.flushIceCandidates(message.from, pc);

        const answer = await pc.createAnswer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true
        });
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

    // =============================
    // 6️⃣ Manejar ANSWER
    // =============================
    async handleAnswer(message: SignalMessage) {
        
        const pc = this.peers().get(message.from);
        if (!pc) return;

        await pc.setRemoteDescription(new RTCSessionDescription(message.payload.data));

        await this.flushIceCandidates(message.from, pc);
    }

    // =============================
    // 7️⃣ Manejar ICE
    // =============================
    /*
    async handleIceCandidate(message: SignalMessage) {
        const pc = this.peers().get(message.from);
        
        if (!pc) return;

        await pc.addIceCandidate(new RTCIceCandidate(message.payload.data));
    }
    */

    async handleIceCandidate(message: SignalMessage) {
        const pc = this.peers().get(message.from);
        if (!pc) return;

        const candidate = new RTCIceCandidate(message.payload.data);

        // Si ya tenemos la descripción remota, lo añadimos directamente
        if (pc.remoteDescription) {
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

    // =============================
    // 8️⃣ Remover peer
    // =============================
    removePeer(userId: string) {
        console.log(`removePeer ${userId}`)
        const pc = this.peers().get(userId);
        if (pc) {
            pc.close();
            this.peers.update(
                current => {
                    const map = new Map(current);
                    map.delete(userId);
                    return map;
                }
            )
            this.remoteStreams.update(
                current => {
                    const map = new Map(current);
                    map.delete(userId);
                    return map;
                }
            )
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
                    console.log("NO tiene dispositivos")
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
