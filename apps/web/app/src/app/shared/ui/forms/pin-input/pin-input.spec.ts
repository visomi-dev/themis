import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { PinInput } from './pin-input';

@Component({
  imports: [PinInput, ReactiveFormsModule],
  template: '<app-pin-input idPrefix="pin" [digits]="6" [formControl]="control" />',
})
class Host {
  readonly control = new FormControl('123456', { nonNullable: true });
}

describe('PinInput', () => {
  let fixture: ComponentFixture<Host>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
    fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
  });

  it('renders one input per digit from a reactive form value', () => {
    const inputs = fixture.nativeElement.querySelectorAll('input') as NodeListOf<HTMLInputElement>;

    expect(inputs.length).toBe(6);
    expect([...inputs].map((inputElement) => inputElement.value).join('')).toBe('123456');
  });
});
