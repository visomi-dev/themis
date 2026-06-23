import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { RadioCard } from './radio-card';

@Component({
  imports: [RadioCard, ReactiveFormsModule],
  template: '<app-radio-card optionValue="standard" [formControl]="control">Standard</app-radio-card>',
})
class Host {
  readonly control = new FormControl('standard', { nonNullable: true });
}

describe('RadioCard', () => {
  let fixture: ComponentFixture<Host>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
    fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
  });

  it('renders a checked radio card', () => {
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;

    expect(input.checked).toBe(true);
  });
});
