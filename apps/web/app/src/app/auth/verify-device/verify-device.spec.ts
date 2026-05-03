import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { VerifyDevice } from './verify-device';

describe('VerifyDevice', () => {
  let component: VerifyDevice;
  let fixture: ComponentFixture<VerifyDevice>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VerifyDevice],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(VerifyDevice);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
