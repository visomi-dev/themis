import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import { Form } from './form';

@Component({
  imports: [Form, ReactiveFormsModule],
  template: `
    <app-form [(submitted)]="submitted" [formGroup]="form" (ngSubmit)="onSubmit()">
      <input formControlName="email" required />
    </app-form>
  `,
})
class Host {
  readonly submitted = signal(false);
  readonly form = new FormBuilder().nonNullable.group({
    email: ['', []],
  });
  onSubmit(): void {
    // counted as an emission indicator; no DOM work required.
  }
}

describe('Form', () => {
  let fixture: ComponentFixture<Host>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('flips data-submitted when the inner <form> is submitted', async () => {
    const form = fixture.nativeElement.querySelector('app-form') as HTMLElement;

    expect(form.hasAttribute('data-submitted')).toBe(false);

    const innerForm = fixture.nativeElement.querySelector('form') as HTMLFormElement;

    innerForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.submitted()).toBe(true);
    expect(form.getAttribute('data-submitted')).toBe('');
  });

  it('mirrors an externally-set submitted signal onto the host', async () => {
    fixture.componentInstance.submitted.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    const form = fixture.nativeElement.querySelector('app-form') as HTMLElement;

    expect(form.getAttribute('data-submitted')).toBe('');
  });

  it('forwards the novalidate attribute to the inner <form>', async () => {
    expect((fixture.nativeElement.querySelector('form') as HTMLFormElement).hasAttribute('novalidate')).toBe(true);
  });
});
