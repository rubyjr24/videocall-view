import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VideoCallLobbyPage } from './video-call-lobby-page';

describe('VideoCallLobbyPage', () => {
  let component: VideoCallLobbyPage;
  let fixture: ComponentFixture<VideoCallLobbyPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VideoCallLobbyPage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VideoCallLobbyPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
