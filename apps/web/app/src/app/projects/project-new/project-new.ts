import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { PROJECTS_URL } from '../../shared/constants/routes';
import { controlError } from '../../shared/form/form-errors';
import { ProjectsApi } from '../../shared/projects/projects';
import { Alert } from '../../shared/ui/overlays/alert/alert';
import { Button } from '../../shared/ui/actions/button/button';
import { Card } from '../../shared/ui/layout/card/card';
import { Container } from '../../shared/ui/layout/container/container';
import { Description } from '../../shared/ui/forms/description/description';
import { ErrorMessage } from '../../shared/ui/forms/error-message/error-message';
import { Field } from '../../shared/ui/forms/field/field';
import { Form as AppForm } from '../../shared/ui/forms/form/form';
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
    AppForm,
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

  private readonly nameValueChanges = toSignal(this.form.controls.name.valueChanges, {
    initialValue: this.form.controls.name.status,
  });
  private readonly summaryValueChanges = toSignal(this.form.controls.summary.valueChanges, {
    initialValue: this.form.controls.summary.status,
  });

  readonly submitting = signal(false);
  readonly submitted = signal(false);
  readonly errorMessage = signal('');
  readonly projectsUrl = PROJECTS_URL;

  readonly nameError = computed(() => {
    this.nameValueChanges();

    return controlError(this.form.controls.name, {
      required: 'Enter a project name.',
      maxlength: 'Use 120 characters or fewer.',
    });
  });

  readonly summaryError = computed(() => {
    this.summaryValueChanges();

    return controlError(this.form.controls.summary, {
      maxlength: 'Use 500 characters or fewer.',
    });
  });

  async submit() {
    if (this.form.invalid) {
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
