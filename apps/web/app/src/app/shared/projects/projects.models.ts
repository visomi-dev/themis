import type {
  AsyncJobRecord,
  AsyncJobStatus,
  AsyncJobType,
  Project,
  ProjectDocument,
  ProjectDocumentStatus,
  ProjectDocumentType,
  ProjectSourceType,
  ProjectStatus,
  ProjectWithDocuments,
} from 'projects';

export type {
  AsyncJobRecord,
  AsyncJobStatus,
  AsyncJobType,
  Project,
  ProjectDocument,
  ProjectDocumentStatus,
  ProjectDocumentType,
  ProjectSourceType,
  ProjectStatus,
  ProjectWithDocuments,
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
