import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { PROJECTS_URL } from '../../shared/constants/routes';
import { ProjectsApi } from '../../shared/projects/projects';
import { Alert } from '../../shared/ui/overlays/alert/alert';
import { Button } from '../../shared/ui/actions/button/button';
import { Card } from '../../shared/ui/layout/card/card';
import { Container } from '../../shared/ui/layout/container/container';
import { Description } from '../../shared/ui/forms/description/description';
import { ErrorMessage } from '../../shared/ui/forms/error-message/error-message';
import { Field } from '../../shared/ui/forms/field/field';
import { Heading } from '../../shared/ui/typography/heading/heading';
import { Input } from '../../shared/ui/forms/input/input';
import { Label } from '../../shared/ui/forms/label/label';
import { Link } from '../../shared/ui/typography/link/link';
import { LinkButton } from '../../shared/ui/actions/link-button/link-button';
import { Textarea } from '../../shared/ui/forms/textarea/textarea';

type NewProjectForm = FormGroup<{
  name: FormControl<string>;
  summary: FormControl<string>;
}>;

@Component({
  host: {
    class: /* tw */ 'block min-h-full w-full',
  },
  imports: [
    Alert,
    Button,
    Card,
    Container,
    Description,
    ErrorMessage,
    Field,
    Heading,
    Input,
    Label,
    Link,
    LinkButton,
    ReactiveFormsModule,
    RouterLink,
    Textarea,
  ],
  selector: 'app-project-new',
  templateUrl: './project-new.html',
  styleUrl: './project-new.css',
})
export class ProjectNew {
  private readonly projectsApi = inject(ProjectsApi);
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

  readonly nameError = signal('');
  readonly summaryError = signal('');
  readonly submitting = signal(false);
  readonly errorMessage = signal('');
  readonly projectsUrl = PROJECTS_URL;

  updateNameError() {
    this.nameError.set(this.nameErrorMessage());
  }

  updateSummaryError() {
    this.summaryError.set(this.summaryErrorMessage());
  }

  nameErrorMessage() {
    const control = this.form.controls.name;

    if (!control.touched || !control.invalid) {
      return '';
    }

    if (control.hasError('required')) {
      return 'Enter a project name.';
    }

    if (control.hasError('maxlength')) {
      return 'Use 120 characters or fewer.';
    }

    return 'This field is invalid.';
  }

  summaryErrorMessage() {
    const control = this.form.controls.summary;

    if (!control.touched || !control.invalid) {
      return '';
    }

    if (control.hasError('maxlength')) {
      return 'Use 500 characters or fewer.';
    }

    return 'This field is invalid.';
  }

  async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.updateNameError();
      this.updateSummaryError();

      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');

    try {
      const project = await this.projectsApi.createProject(this.form.getRawValue());

      await this.router.navigate(['/projects', project.id]);
    } catch {
      this.errorMessage.set('The project could not be created.');
    } finally {
      this.submitting.set(false);
    }
  }
}
