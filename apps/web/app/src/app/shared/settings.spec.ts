import { TestBed } from '@angular/core/testing';

import { Settings } from './settings';

describe('Settings', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');

    TestBed.configureTestingModule({
      providers: [Settings],
    });
  });

  it('toggles theme and persists it', () => {
    const settings = TestBed.inject(Settings);

    const initialDark = settings.isDark();

    settings.toggleTheme();
    TestBed.flushEffects();

    expect(settings.isDark()).toBe(!initialDark);
    expect(document.documentElement.classList.contains('dark')).toBe(!initialDark);
    expect(localStorage.getItem('themis.theme')).toBe(initialDark ? 'light' : 'dark');
  });
});
