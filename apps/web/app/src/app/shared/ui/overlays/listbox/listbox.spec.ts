import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Listbox, type ListboxOption } from './listbox';

@Component({
  imports: [Listbox],
  template: '<app-listbox [options]="options" />',
})
class Host {
  readonly options: ListboxOption[] = [
    { label: 'First', value: 'first' },
    { label: 'Second', value: 'second' },
  ];
}

describe('Listbox', () => {
  let fixture: ComponentFixture<Host>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
    fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
  });

  it('renders options with listbox semantics', () => {
    const listbox = fixture.nativeElement.querySelector('[role="listbox"]') as HTMLElement;
    const options = fixture.nativeElement.querySelectorAll('[role="option"]');

    expect(listbox).toBeTruthy();
    expect(options.length).toBe(2);
  });
});
