DROP TABLE IF EXISTS "account_passkey_enrollments";
--> statement-breakpoint
DROP TABLE IF EXISTS "auth_verification_challenges";
--> statement-breakpoint
DROP TABLE IF EXISTS "user_devices";
--> statement-breakpoint
DROP TABLE IF EXISTS "account_webauthn_challenges";
--> statement-breakpoint
DROP TABLE IF EXISTS "account_passkey_credentials";
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "password_hash";
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "password_configured";
--> statement-breakpoint
CREATE TABLE "auth_email_challenges" (
	"id" text PRIMARY KEY,
	"flow_id" text NOT NULL,
	"normalized_email" text NOT NULL,
	"purpose" text DEFAULT 'bootstrap_recovery' NOT NULL,
	"pin_hash" text NOT NULL,
	"client_context_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"superseded_at" timestamp with time zone,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"last_sent_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_email_challenges_purpose_check" CHECK ("purpose" = 'bootstrap_recovery'),
	CONSTRAINT "auth_email_challenges_attempt_count_check" CHECK ("attempt_count" >= 0 AND "attempt_count" <= 5),
	CONSTRAINT "auth_email_challenges_expiry_check" CHECK ("expires_at" > "created_at"),
	CONSTRAINT "auth_email_challenges_consumed_check" CHECK ("consumed_at" IS NULL OR "consumed_at" >= "created_at"),
	CONSTRAINT "auth_email_challenges_superseded_check" CHECK ("superseded_at" IS NULL OR "superseded_at" >= "created_at")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "auth_email_challenges_flow_active_idx" ON "auth_email_challenges" ("flow_id") WHERE "consumed_at" IS NULL AND "superseded_at" IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "auth_email_challenges_flow_pin_idx" ON "auth_email_challenges" ("flow_id", "pin_hash");
--> statement-breakpoint
CREATE INDEX "auth_email_challenges_expiry_idx" ON "auth_email_challenges" ("expires_at", "consumed_at", "superseded_at");
--> statement-breakpoint
CREATE INDEX "auth_email_challenges_attempt_idx" ON "auth_email_challenges" ("flow_id", "attempt_count");
--> statement-breakpoint
CREATE INDEX "auth_email_challenges_cooldown_idx" ON "auth_email_challenges" ("normalized_email", "last_sent_at");
--> statement-breakpoint
CREATE TABLE "account_passkey_credentials" (
	"id" text PRIMARY KEY,
	"account_id" text NOT NULL,
	"user_id" text NOT NULL,
	"credential_id" text NOT NULL,
	"public_key" text NOT NULL,
	"rp_id" text NOT NULL,
	"label" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"enrollment_flow_id" text,
	"transports" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sign_count" integer DEFAULT 0 NOT NULL,
	"backup_eligible" boolean DEFAULT false NOT NULL,
	"backup_state" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"activated_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "account_passkey_credentials_status_check" CHECK ("status" IN ('pending', 'active', 'revoked')),
	CONSTRAINT "account_passkey_credentials_activation_check" CHECK (("status" = 'pending' AND "activated_at" IS NULL AND "revoked_at" IS NULL) OR ("status" = 'active' AND "activated_at" IS NOT NULL AND "revoked_at" IS NULL) OR ("status" = 'revoked' AND "revoked_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "account_passkey_credentials_credential_idx" ON "account_passkey_credentials" ("credential_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "account_passkey_credentials_account_label_idx" ON "account_passkey_credentials" ("account_id", "label") WHERE "status" <> 'revoked';
--> statement-breakpoint
CREATE INDEX "account_passkey_credentials_account_status_idx" ON "account_passkey_credentials" ("account_id", "status");
--> statement-breakpoint
CREATE INDEX "account_passkey_credentials_enrollment_flow_idx" ON "account_passkey_credentials" ("enrollment_flow_id", "status");
--> statement-breakpoint
ALTER TABLE "account_passkey_credentials" ADD CONSTRAINT "account_passkey_credentials_account_id_accounts_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "account_passkey_credentials" ADD CONSTRAINT "account_passkey_credentials_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
--> statement-breakpoint
CREATE TABLE "auth_webauthn_challenges" (
	"id" text PRIMARY KEY,
	"account_id" text,
	"user_id" text,
	"challenge_hash" text NOT NULL,
	"purpose" text NOT NULL,
	"ceremony_type" text NOT NULL,
	"session_binding" text NOT NULL,
	"flow_id" text,
	"credential_id" text,
	"allow_credential_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"rp_id" text NOT NULL,
	"origin" text NOT NULL,
	"user_verification" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_webauthn_challenges_purpose_check" CHECK ("purpose" IN ('discoverable_authentication', 'restricted_registration', 'restricted_authentication', 'security_registration', 'security_authentication')),
	CONSTRAINT "auth_webauthn_challenges_ceremony_check" CHECK ("ceremony_type" IN ('registration', 'authentication')),
	CONSTRAINT "auth_webauthn_challenges_purpose_ceremony_check" CHECK (("purpose" IN ('restricted_registration', 'security_registration') AND "ceremony_type" = 'registration') OR ("purpose" IN ('discoverable_authentication', 'restricted_authentication', 'security_authentication') AND "ceremony_type" = 'authentication')),
	CONSTRAINT "auth_webauthn_challenges_attempt_count_check" CHECK ("attempt_count" >= 0 AND "attempt_count" <= 1),
	CONSTRAINT "auth_webauthn_challenges_expiry_check" CHECK ("expires_at" > "created_at"),
	CONSTRAINT "auth_webauthn_challenges_consumed_check" CHECK ("consumed_at" IS NULL OR "consumed_at" >= "created_at"),
	CONSTRAINT "auth_webauthn_challenges_discoverable_check" CHECK ("purpose" <> 'discoverable_authentication' OR ("account_id" IS NULL AND "user_id" IS NULL AND "flow_id" IS NULL AND "credential_id" IS NULL AND "allow_credential_ids" = '[]'::jsonb)),
	CONSTRAINT "auth_webauthn_challenges_restricted_check" CHECK ("purpose" NOT IN ('restricted_registration', 'restricted_authentication') OR "flow_id" IS NOT NULL)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "auth_webauthn_challenges_hash_idx" ON "auth_webauthn_challenges" ("challenge_hash");
--> statement-breakpoint
CREATE INDEX "auth_webauthn_challenges_expiry_idx" ON "auth_webauthn_challenges" ("expires_at", "consumed_at");
--> statement-breakpoint
CREATE INDEX "auth_webauthn_challenges_session_idx" ON "auth_webauthn_challenges" ("session_binding", "purpose", "consumed_at");
--> statement-breakpoint
CREATE INDEX "auth_webauthn_challenges_flow_idx" ON "auth_webauthn_challenges" ("flow_id", "purpose");
--> statement-breakpoint
ALTER TABLE "auth_webauthn_challenges" ADD CONSTRAINT "auth_webauthn_challenges_account_id_accounts_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "auth_webauthn_challenges" ADD CONSTRAINT "auth_webauthn_challenges_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
