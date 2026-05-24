import { Component, computed, effect, ElementRef, signal, untracked, ViewChild, WritableSignal } from '@angular/core';
import { AuthService } from '../../../services/auth-service';
import { RxStompService } from '../../../services/messaging/rx-stomp-service';
import { VideoCallService } from '../../../services/video-call-service';
import { SignalMessage } from '../../../interfaces/signal-message';
import { KeyValuePipe, NgStyle } from '@angular/common';
import { SelectorDeviceComponent } from './components/selector-device-component/selector-device-component';

@Component({
    selector: 'video-call-page',
    imports: [KeyValuePipe, SelectorDeviceComponent, NgStyle],
    templateUrl: './video-call-page.html',
    styleUrl: './video-call-page.css',
})
export class VideoCallPage {

    isMicEnabled = signal<boolean>(true);
    isCamEnabled = signal<boolean>(true);

    private onIsMicEnabledEffect = effect(() =>  {
        console.log("onIsMicEnabledEffect")
        this.toggleMute();
    });
    private onIsCamEnabledEffect = effect(() => {
        console.log("onIsCamEnabledEffect")
        //this.onCameraOrMicChange();
    });

    roomId!:number;
    userId!:string;

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

    @ViewChild('videocallsContainer', { static: true })
    videocallsContainer!: ElementRef<HTMLVideoElement>;
    

    cameras = signal<MediaDeviceInfo[]>([]);
    microphones = signal<MediaDeviceInfo[]>([]);
    speakers = signal<MediaDeviceInfo[]>([]);

    camera = signal<MediaDeviceInfo | null>(null);
    microphone = signal<MediaDeviceInfo | null>(null);
    speaker = signal<MediaDeviceInfo | null>(null);

    private onCameraChangeEffect = effect(() => {
        console.log("onCameraChangeEffect")
        this.onCameraOrMicChange();
    });
    private onMicrophoneChangeEffect = effect(() => {
        console.log("onMicrophoneChangeEffect")
        this.onCameraOrMicChange()
    });
    private onSpeakerChangeEffect = effect(() => {
        console.log("onSpeakerChangeEffect")
        this.onSpeakerChange()
    });

    columnsGridVideocallContainer = computed(() => Math.ceil(Math.sqrt(this.peers().size + 1)));

    constructor(
        private auth: AuthService,
        private client: RxStompService,
        private videocall: VideoCallService
    ) { }

    async ngOnInit() {
        
        this.client.connect(); // Cambiar e implementar todo dentro de videocall

        this.userId = this.auth.authData()!.userId.toString();
        this.roomId = this.videocall.roomId!;
        await this.loadDevices();
        await this.initMedia();
        this.listenSocket();
        this.joinRoom();
    }

    ngOnDestroy() {

        // Mandar que el usuario se ha ido de la sala
        this.peers().forEach(pc => pc.close());
        this.localStream()?.getTracks().forEach(t => t.stop());
        this.leftRoom();
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
        });
    }

    leftRoom() {
        this.client.publish(`/api/room/${this.roomId}/signal`, {
            type: 'user-left',
            roomId: this.roomId,
        });
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
            this.remoteStreams.update(
                current =>  {
                    const map = new Map(current);
                    if (map.has(remoteUserId)){
                        map.get(remoteUserId)?.push(...event.streams)
                    }else{ 
                        map.set(remoteUserId, [...event.streams]);
                    }
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
            const offer = await pc.createOffer();
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
        const videocallsContainer = this.videocallsContainer.nativeElement;
        const videos: NodeListOf<HTMLVideoElement> = videocallsContainer.querySelectorAll('video');

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

    // =============================
    // 6️⃣ Manejar ANSWER
    // =============================
    async handleAnswer(message: SignalMessage) {
        
        const pc = this.peers().get(message.from);
        if (!pc) return;

        await pc.setRemoteDescription(new RTCSessionDescription(message.payload.data));
    }

    // =============================
    // 7️⃣ Manejar ICE
    // =============================
    async handleIceCandidate(message: SignalMessage) {
        const pc = this.peers().get(message.from);
        
        if (!pc) return;

        await pc.addIceCandidate(new RTCIceCandidate(message.payload.data));
    }

    // =============================
    // 8️⃣ Remover peer
    // =============================
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
            )
            this.remoteStreams.update(
                current => {
                    const map = new Map(current);
                    map.delete(userId);
                    return map;
                }
            )
        }
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


    async onCameraOrMicChange() {

        untracked(async () => {

            this.localStream()?.getTracks().forEach(track => track.stop());
            
            this.localStream.set(await this.createMediaStream());
            if (!this.localStream()) return;

            if (this.localVideo){
                this.localVideo.nativeElement.srcObject = this.localStream() ?? null;
            }

            this.localStream()?.getTracks().forEach(track => {
                this.updatePeerTrack(track);
            });

        })
        
    }

    async onSpeakerChange() {

        if (this.speaker() == undefined) return;

        const videocallsContainer = this.videocallsContainer.nativeElement;
        const videos: NodeListOf<HTMLVideoElement> = videocallsContainer.querySelectorAll('video');

        videos.forEach(async (video: HTMLVideoElement) => {

            if (this.localVideo && video == this.localVideo.nativeElement) return;

            try {
                await video.setSinkId(this.speaker()!.deviceId);
            } catch (_) {}
        });
        
    }

    updatePeerTrack(newTrack: MediaStreamTrack) {

        console.log("updatePeerTrack")
        
        this.peers().forEach(pc => {
            
            console.log("Senders: ", pc.getSenders())
            const sender = pc.getSenders().find(s => 
                s.track && s.track.kind === newTrack.kind
            );

            console.log("updatePeerTrack", newTrack.kind, sender)

            if (sender) {
                sender.replaceTrack(newTrack)
            }

        });
        
    }

    async toggleMute(){

        this.peers().forEach(async pc => {

            const audioSender = pc.getSenders().find(sender => sender.track?.kind === 'audio');

            if (audioSender == undefined) return;

            if (this.isMicEnabled()){

                untracked(async () => {

                    this.localStream()?.getTracks().forEach((t) => t.stop());

                    this.localStream.set(await this.createMediaStream());
                    if (!this.localStream()) return;

                    this.localStream()!.getTracks().forEach((track) => {
                        this.updatePeerTrack(track);
                    });

                });
            
            }else{

                await audioSender.replaceTrack(null);

                if (this.localStream()) {
                    this.localStream()?.getAudioTracks().forEach(track => track.stop());
                }

            }

        });

    }

    async createMediaStream(){
        const constraints: MediaStreamConstraints = {
            video: this.camera()?.deviceId ? { deviceId: { exact: this.camera()?.deviceId }, width: { ideal: 1280 } } : false,
            audio: this.microphone()?.deviceId ? { deviceId: { exact: this.microphone()?.deviceId } } : true
        };

        try {
            return await navigator.mediaDevices.getUserMedia(constraints);
        }catch(_){
            return undefined;
        }
    }

}
