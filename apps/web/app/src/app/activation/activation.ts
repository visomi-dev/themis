import { HttpErrorResponse } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Component, PLATFORM_ID, inject, signal, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';

import { Activation as ActivationService } from '../shared/activation/activation';
import type {
  ActivationApiKey,
  ActivationMilestone,
  ActivationState,
  CreatedApiKey,
} from '../shared/activation/activation.models';
import { PROJECTS_URL } from '../shared/constants/routes';

type ApiKeyForm = FormGroup<{
  label: FormControl<string>;
}>;

type ConfigTab = 'env' | 'opencode' | 'themis';

@Component({
  host: {
    class: /* tw */ 'block min-h-full w-full',
  },
  imports: [ButtonModule, InputTextModule, MessageModule, ReactiveFormsModule],
  selector: 'app-activation',
  templateUrl: './activation.html',
  styleUrl: './activation.css',
})
export class Activation implements OnInit {
  private readonly activation = inject(ActivationService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly router = inject(Router);

  readonly apiKeyForm: ApiKeyForm = new FormGroup({
    label: new FormControl('Primary workspace key', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(80)],
    }),
  });

  readonly activationState = signal<ActivationState | null>(null);
  readonly continuing = signal(false);
  readonly copyMessage = signal('');
  readonly creatingKey = signal(false);
  readonly errorMessage = signal('');
  readonly generatedKey = signal<CreatedApiKey | null>(null);
  readonly loading = signal(true);
  readonly revokingKeyId = signal('');
  readonly selectedConfigTab = signal<ConfigTab>('themis');

  async ngOnInit() {
    await this.loadActivationState();
  }

  async createApiKey() {
    if (this.apiKeyForm.invalid) {
      this.apiKeyForm.markAllAsTouched();

      return;
    }

    this.creatingKey.set(true);
    this.errorMessage.set('');

    try {
      const createdKey = await this.activation.createApiKey(this.apiKeyForm.getRawValue());

      this.generatedKey.set(createdKey);
      await this.loadActivationState();
    } catch (error) {
      this.errorMessage.set(
        error instanceof HttpErrorResponse
          ? (error.error?.message ?? 'The API key could not be created.')
          : 'The API key could not be created.',
      );
    } finally {
      this.creatingKey.set(false);
    }
  }

  async copyGeneratedKey() {
    const createdKey = this.generatedKey();

    if (!createdKey) {
      return;
    }

    await this.copyText(createdKey.plaintextToken, 'API key copied to your clipboard.');
  }

  async copySeedPrompt() {
    const activationState = this.activationState();

    if (!activationState) {
      return;
    }

    const copied = await this.copyText(activationState.seedPrompt, 'Seed prompt copied to your clipboard.');

    if (copied) {
      await this.recordMilestone('seed_prompt_copied');
    }
  }

  async copySelectedConfig() {
    const copied = await this.copyText(this.currentConfigText(), 'Configuration copied to your clipboard.');

    if (copied) {
      await this.recordMilestone('config_copied');
    }
  }

  async continueToProjects() {
    this.continuing.set(true);

    try {
      await this.recordMilestone('activation_completed');
      await this.router.navigate([PROJECTS_URL]);
    } finally {
      this.continuing.set(false);
    }
  }

  async skipForNow() {
    this.continuing.set(true);

    try {
      await this.recordMilestone('activation_skipped');
      await this.router.navigate([PROJECTS_URL]);
    } finally {
      this.continuing.set(false);
    }
  }

  async revokeApiKey(apiKeyId: string) {
    this.revokingKeyId.set(apiKeyId);
    this.errorMessage.set('');

    try {
      await this.activation.revokeApiKey(apiKeyId);

      if (this.generatedKey()?.id === apiKeyId) {
        this.generatedKey.set(null);
      }

      await this.loadActivationState();
    } catch (error) {
      this.errorMessage.set(
        error instanceof HttpErrorResponse
          ? (error.error?.message ?? 'The API key could not be revoked.')
          : 'The API key could not be revoked.',
      );
    } finally {
      this.revokingKeyId.set('');
    }
  }

  selectConfigTab(tab: ConfigTab) {
    this.selectedConfigTab.set(tab);
  }

  currentConfigPath() {
    switch (this.selectedConfigTab()) {
      case 'env':
        return '.env.production';
      case 'opencode':
        return '~/.config/opencode/opencode.json';
      default:
        return '~/.config/themis/core.json';
    }
  }

  currentConfigText() {
    const apiKeyValue = this.generatedKey()?.plaintextToken ?? '<paste-your-generated-key>';

    switch (this.selectedConfigTab()) {
      case 'env':
        return `THEMIS_API_KEY=${apiKeyValue}`;
      case 'opencode':
        return JSON.stringify(
          {
            integrations: {
              themis: {
                apiKeyEnv: 'THEMIS_API_KEY',
                seedPromptSource: 'themis-core-activation',
              },
            },
          },
          null,
          2,
        );
      default:
        return JSON.stringify(
          {
            workspace: 'themis',
            apiKeyEnv: 'THEMIS_API_KEY',
            promptPreset: 'themis-core-activation',
          },
          null,
          2,
        );
    }
  }

  keyCreatedAtLabel(apiKey: ActivationApiKey) {
    return new Date(apiKey.createdAt).toLocaleDateString();
  }

  plaintextTokenFor(apiKey: ActivationApiKey) {
    const generatedKey = this.generatedKey();

    return generatedKey?.id === apiKey.id ? generatedKey.plaintextToken : '';
  }

  hasMilestone(milestone: ActivationMilestone) {
    return this.activationState()?.milestones.includes(milestone) ?? false;
  }

  private async loadActivationState() {
    this.loading.set(true);
    this.errorMessage.set('');

    try {
      this.activationState.set(await this.activation.loadState());
    } catch (error) {
      this.errorMessage.set(
        error instanceof HttpErrorResponse
          ? (error.error?.message ?? 'Activation settings could not be loaded.')
          : 'Activation settings could not be loaded.',
      );
    } finally {
      this.loading.set(false);
    }
  }

  private async copyText(value: string, message: string) {
    if (!isPlatformBrowser(this.platformId) || !navigator.clipboard) {
      this.copyMessage.set('Clipboard access is not available in this browser.');

      return false;
    }

    await navigator.clipboard.writeText(value);
    this.copyMessage.set(message);

    return true;
  }

  private async recordMilestone(milestone: ActivationMilestone) {
    try {
      await this.activation.recordMilestone(milestone);
      await this.loadActivationState();
    } catch {
      // Milestone tracking should not block the primary action.
    }
  }
}
