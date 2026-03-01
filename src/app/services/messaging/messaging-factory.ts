import { IMessagingService } from "../../interfaces/imessaging-service";
import { AuthService } from "../auth-service";
import { ConfigService } from "../config-service";
import { RxStompService } from "./rx-stomp-service";

export class MessagingFactory {
  static create(type: 'stomp' | 'webrtc', auth: AuthService, config: ConfigService): IMessagingService {
    switch (type) {
      case 'stomp':
        return new RxStompService(config, auth);
      case 'webrtc':
        return new RxStompService(config, auth);
      default:
        throw new Error(`Tipo de mensajería ${type} no soportado`);
    }
  }
}