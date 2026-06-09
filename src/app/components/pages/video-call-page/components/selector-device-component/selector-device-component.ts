import { Component, Input, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoDirective } from "@ngneat/transloco";

@Component({
  selector: 'selector-device-component',
  imports: [FormsModule, TranslocoDirective],
  templateUrl: './selector-device-component.html',
  styleUrl: './selector-device-component.css',
})
export class SelectorDeviceComponent {

  device = model<MediaDeviceInfo | null>();

  @Input() devices: MediaDeviceInfo[] = [];

  onDeviceChange(deviceId: string) {

    const selectedDevice = this.devices.find(device => device.deviceId === deviceId);

    if (selectedDevice) {
      this.device.set(selectedDevice);
    }
  }

}
