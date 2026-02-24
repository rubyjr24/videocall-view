import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VideoCallPage } from './video-call-page';

describe('VideoCallPage', () => {
  let component: VideoCallPage;
  let fixture: ComponentFixture<VideoCallPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VideoCallPage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VideoCallPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
