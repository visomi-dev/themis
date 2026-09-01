import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';

import { Card } from '../shared/ui/layout/card/card';
import { Heading } from '../shared/ui/typography/heading/heading';
import { Button } from '../shared/ui/actions/button/button';
import { Auth } from '../shared/auth/auth';
import { Passkey, type PasskeyCredential } from '../shared/auth/passkey';

type View = 'list' | 'add' | 'name' | 'revoke';

@Component({
  imports: [Button, Card, DatePipe, Heading],
  selector: 'app-security',
  templateUrl: './security.html',
  styleUrl: './security.css',
})
export class Security {
  private readonly auth = inject(Auth);
  private readonly passkey = inject(Passkey);
  readonly credentials = signal<PasskeyCredential[]>([]);
  readonly view = signal<View>('list');
  readonly selected = signal<PasskeyCredential | null>(null);
  readonly passkeyName = signal('');
  readonly passkeyLoading = signal(true);
  readonly passkeySubmitting = signal(false);
  readonly passkeyError = signal('');

  constructor() {
    void this.loadCredentials();
  }

  private async loadCredentials() {
    try {
      this.credentials.set(await this.passkey.listCredentials());
    } catch {
      this.passkeyError.set('Passkeys could not be loaded.');
    } finally {
      this.passkeyLoading.set(false);
    }
  }

  showAdd() {
    this.passkeyError.set('');
    this.passkeyName.set('');
    this.view.set('add');
  }

  showRename(credential: PasskeyCredential) {
    this.passkeyError.set('');
    this.selected.set(credential);
    this.passkeyName.set(credential.label);
    this.view.set('name');
  }

  showRevoke(credential: PasskeyCredential) {
    this.passkeyError.set('');
    this.selected.set(credential);
    this.view.set('revoke');
  }

  cancelPasskeyAction() {
    this.selected.set(null);
    this.view.set('list');
  }

  setPasskeyName(event: Event) {
    const input = event.target;

    if (input instanceof HTMLInputElement) this.passkeyName.set(input.value);
  }

  async addPasskey() {
    const name = this.passkeyName().trim();

    if (!name || this.passkeySubmitting()) return;
    await this.runPasskeyMutation(async () => {
      const user = this.auth.user();

      if (!user) throw new Error('Sign in again before adding a passkey.');
      const authentication = await this.passkey.beginAuthentication();
      const existing = await this.passkey.getCredential(authentication.options!);

      await this.passkey.completeAuthentication(authentication.challengeId!, existing);
      const registration = await this.passkey.beginRegistration(name);
      const credential = await this.passkey.createCredential(registration.options!);

      await this.passkey.completeRegistration(registration.challengeId!, credential);
      await this.loadCredentials();
      this.cancelPasskeyAction();
    });
  }

  async renamePasskey() {
    const selected = this.selected();
    const name = this.passkeyName().trim();

    if (!selected || !name || this.passkeySubmitting()) return;
    await this.runPasskeyMutation(async () => {
      await this.reauthenticateWithPasskey();
      const updated = await this.passkey.renameCredential(selected.id, name);

      this.credentials.update((items) => items.map((item) => (item.id === updated.id ? updated : item)));
      this.cancelPasskeyAction();
    });
  }

  async revokePasskey() {
    const selected = this.selected();

    if (!selected || this.passkeySubmitting()) return;
    await this.runPasskeyMutation(async () => {
      await this.reauthenticateWithPasskey();
      await this.passkey.revokeCredential(selected.id);
      this.credentials.update((items) => items.filter((item) => item.id !== selected.id));
      this.cancelPasskeyAction();
    });
  }

  private async reauthenticateWithPasskey() {
    const user = this.auth.user();

    if (!user) throw new Error('Sign in again before changing passkeys.');
    const authentication = await this.passkey.beginAuthentication();
    const credential = await this.passkey.getCredential(authentication.options!);

    await this.passkey.completeAuthentication(authentication.challengeId!, credential);
  }

  private async runPasskeyMutation(mutation: () => Promise<void>) {
    this.passkeySubmitting.set(true);
    this.passkeyError.set('');
    try {
      await mutation();
    } catch (error) {
      this.passkeyError.set(
        error instanceof HttpErrorResponse
          ? (error.error?.message ?? 'Passkey action failed.')
          : 'Passkey action failed.',
      );
    } finally {
      this.passkeySubmitting.set(false);
    }
  }
}
