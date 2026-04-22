CREATE TABLE "accounts" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"owner_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_slug_idx" ON "accounts" ("slug");
--> statement-breakpoint
CREATE TABLE "account_memberships" (
	"id" text PRIMARY KEY,
	"account_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'owner' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "account_memberships_account_user_idx" ON "account_memberships" ("account_id", "user_id");
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_owner_user_id_users_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "account_memberships" ADD CONSTRAINT "account_memberships_account_id_accounts_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "account_memberships" ADD CONSTRAINT "account_memberships_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "account_id" text;
--> statement-breakpoint
ALTER TABLE "user_activation_milestones" ADD COLUMN "account_id" text;
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "account_id" text;
--> statement-breakpoint
ALTER TABLE "project_documents" ADD COLUMN "account_id" text;
--> statement-breakpoint
ALTER TABLE "async_jobs" ADD COLUMN "account_id" text;
--> statement-breakpoint
INSERT INTO "accounts" ("id", "name", "slug", "owner_user_id", "created_at", "updated_at")
SELECT u."id", split_part(u."email", '@', 1), regexp_replace(split_part(u."email", '@', 1), '[^a-zA-Z0-9]+', '-', 'g'), u."id", now(), now()
FROM "users" u;
--> statement-breakpoint
INSERT INTO "account_memberships" ("id", "account_id", "user_id", "role", "created_at", "updated_at")
SELECT md5(u."id" || ':owner'), u."id", u."id", 'owner', now(), now()
FROM "users" u;
--> statement-breakpoint
UPDATE "api_keys" SET "account_id" = "user_id" WHERE "account_id" IS NULL;
--> statement-breakpoint
UPDATE "user_activation_milestones" SET "account_id" = "user_id" WHERE "account_id" IS NULL;
--> statement-breakpoint
UPDATE "projects" SET "account_id" = "created_by_user_id" WHERE "account_id" IS NULL;
--> statement-breakpoint
UPDATE "project_documents" pd SET "account_id" = p."account_id" FROM "projects" p WHERE pd."project_id" = p."id" AND pd."account_id" IS NULL;
--> statement-breakpoint
UPDATE "async_jobs" aj SET "account_id" = p."account_id" FROM "projects" p WHERE aj."project_id" = p."id" AND aj."account_id" IS NULL;
--> statement-breakpoint
UPDATE "async_jobs" SET "account_id" = "user_id" WHERE "account_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "api_keys" ALTER COLUMN "account_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "user_activation_milestones" ALTER COLUMN "account_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "projects" ALTER COLUMN "account_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "project_documents" ALTER COLUMN "account_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "async_jobs" ALTER COLUMN "account_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_account_id_accounts_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "user_activation_milestones" ADD CONSTRAINT "user_activation_milestones_account_id_accounts_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_account_id_accounts_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "project_documents" ADD CONSTRAINT "project_documents_account_id_accounts_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "async_jobs" ADD CONSTRAINT "async_jobs_account_id_accounts_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "api_keys" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "user_activation_milestones" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "project_documents" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "async_jobs" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "api_keys_account_isolation" ON "api_keys" USING ("account_id" = current_setting('app.current_account_id', true));
--> statement-breakpoint
CREATE POLICY "user_activation_milestones_account_isolation" ON "user_activation_milestones" USING ("account_id" = current_setting('app.current_account_id', true));
--> statement-breakpoint
CREATE POLICY "projects_account_isolation" ON "projects" USING ("account_id" = current_setting('app.current_account_id', true));
--> statement-breakpoint
CREATE POLICY "project_documents_account_isolation" ON "project_documents" USING ("account_id" = current_setting('app.current_account_id', true));
--> statement-breakpoint
CREATE POLICY "async_jobs_account_isolation" ON "async_jobs" USING ("account_id" = current_setting('app.current_account_id', true));
