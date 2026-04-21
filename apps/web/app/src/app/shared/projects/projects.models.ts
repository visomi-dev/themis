export type ProjectDocumentType =
  | 'architecture'
  | 'brief'
  | 'imported_reference'
  | 'operational_notes'
  | 'overview'
  | 'setup';

export type ProjectDocumentStatus = 'active' | 'archived' | 'draft';

export type ProjectSourceType = 'imported' | 'manual' | 'seeded';

export type ProjectStatus = 'active' | 'archived' | 'draft';

export type ProjectDocument = {
  contentMarkdown: string;
  createdAt: string;
  createdByUserId: string;
  documentType: ProjectDocumentType;
  id: string;
  projectId: string;
  source: string;
  status: ProjectDocumentStatus;
  title: string;
  updatedAt: string;
};

export type Project = {
  createdAt: string;
  createdByUserId: string;
  id: string;
  name: string;
  slug: string;
  sourceType: ProjectSourceType;
  status: ProjectStatus;
  summary: string | null;
  updatedAt: string;
};

export type ProjectWithDocuments = Project & {
  documents: ProjectDocument[];
};

export type CreateProjectPayload = {
  name: string;
  sourceType?: ProjectSourceType;
  summary?: string;
};

export type UpdateProjectPayload = {
  name?: string;
  status?: ProjectStatus;
  summary?: string | null;
};

export type CreateDocumentPayload = {
  contentMarkdown: string;
  documentType: ProjectDocumentType;
  source?: string;
  status?: ProjectDocumentStatus;
  title: string;
};