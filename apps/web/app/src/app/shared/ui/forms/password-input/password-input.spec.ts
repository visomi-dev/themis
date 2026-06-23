import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { PasswordInput } from './password-input';

@Component({
  imports: [PasswordInput, ReactiveFormsModule],
  template: '<app-password-input [formControl]="control" />',
})
class Host {
  readonly control = new FormControl('secret123!', { nonNullable: true });
}

describe('PasswordInput', () => {
  let fixture: ComponentFixture<Host>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
    fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
  });

  it('renders a password control value', () => {
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;

    expect(input.value).toBe('secret123!');
    expect(input.type).toBe('password');
  });
});
