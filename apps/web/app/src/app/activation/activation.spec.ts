import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Activation as ActivationService } from '../shared/activation/activation';
import { Auth } from '../shared/auth/auth';

import { Activation } from './activation';

describe('Activation', () => {
  let component: Activation;
  let fixture: ComponentFixture<Activation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Activation],
      providers: [
        provideRouter([]),
        {
          provide: ActivationService,
          useValue: {
            createApiKey: vi.fn(),
            loadState: vi.fn().mockResolvedValue({ apiKeys: [], milestones: [], seedPrompt: '' }),
            recordMilestone: vi.fn(),
            revokeApiKey: vi.fn(),
          },
        },
        {
          provide: Auth,
          useValue: {
            signOut: vi.fn(),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Activation);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
