ALTER TABLE "company_settings"
ADD COLUMN "routeIntelligenceSettings" JSONB NOT NULL DEFAULT '{}'::jsonb;
