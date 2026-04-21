type ProjectSourceType = 'imported' | 'manual' | 'seeded';

type ProjectStatus = 'active' | 'archived' | 'draft';

type ProjectDocumentType = 'architecture' | 'brief' | 'imported_reference' | 'operational_notes' | 'overview' | 'setup';

type ProjectDocumentStatus = 'active' | 'archived' | 'draft';

type ProjectDocument = {
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

type Project = {
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

type ProjectWithDocuments = Project & {
  documents: ProjectDocument[];
};

export type {
  Project,
  ProjectDocument,
  ProjectDocumentStatus,
  ProjectDocumentType,
  ProjectSourceType,
  ProjectStatus,
  ProjectWithDocuments,
};