import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { Input } from './input';

@Component({
  imports: [Input, ReactiveFormsModule],
  template: '<app-input controlId="name" [formControl]="control" />',
})
class Host {
  readonly control = new FormControl('Ada', { nonNullable: true });
}

describe('Input', () => {
  let fixture: ComponentFixture<Host>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
    fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
  });

  it('works as a reactive form control', () => {
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;

    expect(input.value).toBe('Ada');
  });
});
