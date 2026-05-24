import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectorDeviceComponent } from './selector-device-component';

describe('SelectorDeviceComponent', () => {
  let component: SelectorDeviceComponent;
  let fixture: ComponentFixture<SelectorDeviceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectorDeviceComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SelectorDeviceComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
