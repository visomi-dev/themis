import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { activatedGuard } from './activated.guard';

describe('activatedGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => activatedGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
