import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';

import { Auth } from '../../shared/auth/auth';
import { PROJECTS_URL, SIGN_IN_URL } from '../../shared/constants/routes';
import { ThemeSwitcher } from '../../shared/layout/theme-switcher/theme-switcher';
import { ProjectsService } from '../../shared/projects/projects.service';

type NewProjectForm = FormGroup<{
  name: FormControl<string>;
  summary: FormControl<string>;
}>;

@Component({
  host: {
    class: /* tw */ 'block min-h-full w-full',
  },
  imports: [ButtonModule, InputTextModule, MessageModule, ReactiveFormsModule, RouterLink, ThemeSwitcher],
  selector: 'app-project-new',
  templateUrl: './project-new.html',
  styleUrl: './project-new.css',
})
export class ProjectNew {
  private readonly auth = inject(Auth);
  private readonly projectsService = inject(ProjectsService);
  private readonly router = inject(Router);

  readonly form: NewProjectForm = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(120)],
    }),
    summary: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(500)],
    }),
  });

  readonly submitting = signal(false);
  readonly errorMessage = signal('');
  readonly projectsUrl = PROJECTS_URL;

  async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');

    try {
      const project = await this.projectsService.createProject(this.form.getRawValue());
      await this.router.navigate(['/projects', project.id]);
    } catch {
      this.errorMessage.set('The project could not be created.');
    } finally {
      this.submitting.set(false);
    }
  }

  async signOut() {
    await this.auth.signOut();
    await this.router.navigate([SIGN_IN_URL]);
  }
}
