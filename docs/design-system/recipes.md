# Themis UI Recipes

## Field With Error

```html
<app-field>
  <app-label for="project-name">Project name</app-label>
  <app-input id="project-name" formControlName="name" [invalid]="nameInvalid" ariaDescribedBy="project-name-error" />
  @if (nameInvalid) {
  <app-error-message id="project-name-error">Project name is required.</app-error-message>
  }
</app-field>
```

## Page Header

```html
<app-page-header>
  <p data-slot="eyebrow" class="text-accent text-sm font-semibold">Projects</p>
  <h1 data-slot="title" class="font-heading text-4xl font-bold">Project workspace</h1>
  <p data-slot="description" class="text-muted-fg">Manage active work.</p>
  <app-button data-slot="actions">New project</app-button>
</app-page-header>
```

## Dialog

```html
<app-dialog [open]="dialogOpen()" ariaLabelledBy="dialog-title" (closed)="dialogOpen.set(false)">
  <h2 id="dialog-title" class="font-heading text-2xl font-bold">Confirm action</h2>
  <p class="text-muted-fg">This action can be undone from settings.</p>
</app-dialog>
```
