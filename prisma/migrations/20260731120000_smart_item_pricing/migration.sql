CREATE TABLE "item_library" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "basePrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "disposalFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "laborHours" DOUBLE PRECISION NOT NULL DEFAULT 0.25,
  "weightClass" TEXT NOT NULL DEFAULT 'Medium',
  "estimatedVolume" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "recyclable" BOOLEAN NOT NULL DEFAULT false,
  "donationEligible" BOOLEAN NOT NULL DEFAULT false,
  "hazardous" BOOLEAN NOT NULL DEFAULT false,
  "refrigerant" BOOLEAN NOT NULL DEFAULT false,
  "electronics" BOOLEAN NOT NULL DEFAULT false,
  "mattress" BOOLEAN NOT NULL DEFAULT false,
  "tire" BOOLEAN NOT NULL DEFAULT false,
  "appliance" BOOLEAN NOT NULL DEFAULT false,
  "constructionDebris" BOOLEAN NOT NULL DEFAULT false,
  "yardWaste" BOOLEAN NOT NULL DEFAULT false,
  "requiresTwoPeople" BOOLEAN NOT NULL DEFAULT false,
  "requiresDisassembly" BOOLEAN NOT NULL DEFAULT false,
  "requiresSpecialEquipment" BOOLEAN NOT NULL DEFAULT false,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "item_library_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "item_library_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "item_library_pricing_check" CHECK ("basePrice" >= 0 AND "disposalFee" >= 0 AND "estimatedVolume" >= 0),
  CONSTRAINT "item_library_labor_check" CHECK ("laborHours" > 0),
  CONSTRAINT "item_library_weight_check" CHECK ("weightClass" IN ('Light','Medium','Heavy','Extra Heavy'))
);
CREATE INDEX "item_library_companyId_idx" ON "item_library"("companyId");
CREATE INDEX "item_library_companyId_category_idx" ON "item_library"("companyId","category");
CREATE INDEX "item_library_companyId_active_idx" ON "item_library"("companyId","active");
CREATE INDEX "item_library_companyId_displayOrder_idx" ON "item_library"("companyId","displayOrder");
CREATE UNIQUE INDEX "item_library_active_name_category_unique"
  ON "item_library"("companyId", lower("category"), lower("name")) WHERE "active" = true;

CREATE TABLE "pricing_profile_item_overrides" (
  "id" TEXT NOT NULL,
  "pricingProfileId" TEXT NOT NULL,
  "itemLibraryId" TEXT NOT NULL,
  "basePrice" DOUBLE PRECISION,
  "disposalFee" DOUBLE PRECISION,
  "laborHours" DOUBLE PRECISION,
  "crewRequirement" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pricing_profile_item_overrides_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "pricing_profile_item_overrides_pricingProfileId_fkey" FOREIGN KEY ("pricingProfileId") REFERENCES "pricing_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "pricing_profile_item_overrides_itemLibraryId_fkey" FOREIGN KEY ("itemLibraryId") REFERENCES "item_library"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "pricing_profile_item_overrides_values_check" CHECK (
    ("basePrice" IS NULL OR "basePrice" >= 0) AND
    ("disposalFee" IS NULL OR "disposalFee" >= 0) AND
    ("laborHours" IS NULL OR "laborHours" > 0) AND
    ("crewRequirement" IS NULL OR "crewRequirement" >= 1)
  )
);
CREATE UNIQUE INDEX "pricing_profile_item_overrides_pricingProfileId_itemLibraryId_key"
  ON "pricing_profile_item_overrides"("pricingProfileId","itemLibraryId");
CREATE INDEX "pricing_profile_item_overrides_pricingProfileId_idx" ON "pricing_profile_item_overrides"("pricingProfileId");
CREATE INDEX "pricing_profile_item_overrides_itemLibraryId_idx" ON "pricing_profile_item_overrides"("itemLibraryId");

INSERT INTO "item_library" (
  "id","companyId","category","name","displayOrder","basePrice","disposalFee","laborHours",
  "weightClass","estimatedVolume","recyclable","donationEligible","refrigerant","electronics",
  "mattress","tire","appliance","requiresTwoPeople"
)
SELECT c."id" || ':' || seed.slug, c."id", seed.category, seed.name, seed.ord,
  seed.price, seed.disposal, seed.labor, seed.weight, seed.volume, seed.recyclable,
  seed.donation, seed.refrigerant, seed.electronics, seed.mattress, seed.tire,
  seed.appliance, seed.two_people
FROM companies c
CROSS JOIN (VALUES
  ('refrigerator','Appliances','Refrigerator',10,125.0,25.0,0.75,'Heavy',25.0,true,false,true,false,false,false,true,true),
  ('freezer','Appliances','Freezer',20,120.0,25.0,0.75,'Heavy',22.0,true,false,true,false,false,false,true,true),
  ('washer','Appliances','Washer',30,95.0,20.0,0.50,'Heavy',15.0,true,false,false,false,false,false,true,true),
  ('dryer','Appliances','Dryer',40,90.0,20.0,0.50,'Heavy',15.0,true,false,false,false,false,false,true,true),
  ('mattress','Household','Mattress',50,85.0,35.0,0.40,'Medium',18.0,false,false,false,false,true,false,false,false),
  ('box','Household','Boxes',60,8.0,0.0,0.10,'Light',2.0,true,false,false,false,false,false,false,false),
  ('tires','Garage','Tires',70,20.0,8.0,0.20,'Medium',4.0,true,false,false,false,false,true,false,false),
  ('couch','Furniture','Couch',80,175.0,30.0,1.00,'Extra Heavy',35.0,false,true,false,false,false,false,false,true),
  ('dresser','Furniture','Dresser',90,95.0,15.0,0.50,'Heavy',18.0,false,true,false,false,false,false,false,false),
  ('television','Electronics','Television',100,40.0,10.0,0.25,'Medium',6.0,true,false,false,true,false,false,false,false)
) AS seed(slug,category,name,ord,price,disposal,labor,weight,volume,recyclable,donation,refrigerant,electronics,mattress,tire,appliance,two_people);

ALTER TABLE "estimate_items"
  ADD COLUMN "libraryItemId" TEXT,
  ADD COLUMN "basePrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "disposalFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "laborHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "weightClass" TEXT NOT NULL DEFAULT 'Medium',
  ADD COLUMN "estimatedVolume" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "crewRequirement" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "recyclable" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "donationEligible" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "hazardous" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "refrigerant" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "electronics" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "mattress" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "tire" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "appliance" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "constructionDebris" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "yardWaste" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "requiresDisassembly" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "requiresSpecialEquipment" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "pricingManuallyEdited" BOOLEAN NOT NULL DEFAULT false;

UPDATE "estimate_items" e
SET "libraryItemId" = i."id",
    "basePrice" = i."basePrice",
    "disposalFee" = i."disposalFee",
    "laborHours" = i."laborHours",
    "weightClass" = i."weightClass",
    "estimatedVolume" = i."estimatedVolume",
    "crewRequirement" = CASE WHEN i."requiresTwoPeople" THEN 2 ELSE 1 END,
    "recyclable" = i."recyclable",
    "donationEligible" = i."donationEligible",
    "refrigerant" = i."refrigerant",
    "electronics" = i."electronics",
    "mattress" = i."mattress",
    "tire" = i."tire",
    "appliance" = i."appliance"
FROM "item_library" i
JOIN "job_sites" s ON s."estimateId" IS NOT NULL
JOIN estimates est ON est."id" = s."estimateId"
WHERE e."jobSiteId" = s."id"
  AND i."companyId" = est."companyId"
  AND i."id" = est."companyId" || ':' || e."itemId";

ALTER TABLE "estimate_items"
  ADD CONSTRAINT "estimate_items_libraryItemId_fkey"
  FOREIGN KEY ("libraryItemId") REFERENCES "item_library"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "estimate_items_libraryItemId_idx" ON "estimate_items"("libraryItemId");
