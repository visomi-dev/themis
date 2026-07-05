import { Component, computed, inject, signal } from '@angular/core';
import { form, maxLength, required, type FieldTree } from '@angular/forms/signals';
import { FormField, FormRoot } from '@angular/forms/signals';
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
import { Form as AppForm } from '../../shared/ui/forms/form/form';
import { Heading } from '../../shared/ui/typography/heading/heading';
import { Input } from '../../shared/ui/forms/input/input';
import { Label } from '../../shared/ui/forms/label/label';
import { Link } from '../../shared/ui/typography/link/link';
import { LinkButton } from '../../shared/ui/actions/link-button/link-button';
import { Textarea } from '../../shared/ui/forms/textarea/textarea';

type NewProjectModel = {
  name: string;
  summary: string;
};

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
    FormField,
    FormRoot,
    Heading,
    Input,
    Label,
    Link,
    LinkButton,
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

  readonly newProjectModel = signal<NewProjectModel>({ name: '', summary: '' });

  readonly newProjectForm: FieldTree<NewProjectModel> = form(
    this.newProjectModel,
    (p) => {
      required(p.name, { message: 'Enter a project name.' });
      maxLength(p.name, 120, { message: 'Use 120 characters or fewer.' });
      maxLength(p.summary, 500, { message: 'Use 500 characters or fewer.' });
    },
    {
      submission: {
        action: async (field) => {
          await this.submit(field);
        },
      },
    },
  );

  readonly submitting = signal(false);
  readonly errorMessage = signal('');
  readonly projectsUrl = PROJECTS_URL;

  readonly nameError = computed(() => this.newProjectForm.name().errors()[0]?.message ?? '');
  readonly summaryError = computed(() => this.newProjectForm.summary().errors()[0]?.message ?? '');

  private async submit(field: FieldTree<NewProjectModel>): Promise<void> {
    if (this.submitting()) {
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');

    try {
      const project = await this.projectsApi.createProject(field().value());

      await this.router.navigate(['/projects', project.id]);
    } catch {
      this.errorMessage.set('The project could not be created.');
    } finally {
      this.submitting.set(false);
    }
  }
}
