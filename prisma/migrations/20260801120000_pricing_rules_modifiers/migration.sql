CREATE TABLE "pricing_rules" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "pricingProfileId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "category" TEXT NOT NULL,
    "applicationMode" TEXT NOT NULL DEFAULT 'Automatic',
    "valueType" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "maxValue" DOUBLE PRECISION,
    "minimumEstimate" DOUBLE PRECISION,
    "maximumEstimate" DOUBLE PRECISION,
    "taxable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "pricing_rules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "rule_conditions" (
    "id" TEXT NOT NULL,
    "pricingRuleId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "operator" TEXT NOT NULL DEFAULT 'equals',
    "value" TEXT NOT NULL,
    "secondaryValue" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "rule_conditions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "estimate_pricing_rules" (
    "id" TEXT NOT NULL,
    "estimateId" TEXT NOT NULL,
    "pricingRuleId" TEXT,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "calculationType" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "calculatedAmount" DOUBLE PRECISION NOT NULL,
    "taxable" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'Automatic',
    "status" TEXT NOT NULL DEFAULT 'Applied',
    "reason" TEXT,
    "manuallyAdjusted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "estimate_pricing_rules_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "pricing_rules_companyId_idx" ON "pricing_rules"("companyId");
CREATE INDEX "pricing_rules_companyId_active_priority_idx" ON "pricing_rules"("companyId", "active", "priority");
CREATE INDEX "pricing_rules_pricingProfileId_active_idx" ON "pricing_rules"("pricingProfileId", "active");
CREATE INDEX "rule_conditions_pricingRuleId_displayOrder_idx" ON "rule_conditions"("pricingRuleId", "displayOrder");
CREATE INDEX "estimate_pricing_rules_estimateId_displayOrder_idx" ON "estimate_pricing_rules"("estimateId", "displayOrder");
CREATE INDEX "estimate_pricing_rules_pricingRuleId_idx" ON "estimate_pricing_rules"("pricingRuleId");

ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pricing_rules" ADD CONSTRAINT "pricing_rules_pricingProfileId_fkey" FOREIGN KEY ("pricingProfileId") REFERENCES "pricing_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rule_conditions" ADD CONSTRAINT "rule_conditions_pricingRuleId_fkey" FOREIGN KEY ("pricingRuleId") REFERENCES "pricing_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "estimate_pricing_rules" ADD CONSTRAINT "estimate_pricing_rules_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "estimates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "estimate_pricing_rules" ADD CONSTRAINT "estimate_pricing_rules_pricingRuleId_fkey" FOREIGN KEY ("pricingRuleId") REFERENCES "pricing_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Common rules are company-owned. Rules requiring estimator input are seeded
-- as Optional; deterministic item/property rules can evaluate automatically.
INSERT INTO "pricing_rules" (
  "id", "companyId", "name", "description", "active", "priority", "category",
  "applicationMode", "valueType", "value", "taxable", "updatedAt"
)
SELECT
  c."id" || ':pricing-rule:' || seed.slug,
  c."id", seed.name, seed.description, true, seed.priority, seed.category,
  seed.mode, seed.value_type, seed.amount, seed.taxable, CURRENT_TIMESTAMP
FROM "companies" c
CROSS JOIN (VALUES
  ('second-floor','Second Floor','Access charge for second-floor removal.',10,'Access','Automatic','FlatFee',25.0,true),
  ('third-floor','Third Floor','Access charge for third-floor removal.',11,'Access','Automatic','FlatFee',50.0,true),
  ('basement','Basement','Access charge for basement removal.',12,'Access','Optional','FlatFee',35.0,true),
  ('long-carry','Long Carry','Long carry distance modifier.',20,'Access','Optional','FlatFee',40.0,true),
  ('heavy-lift','Heavy Lift','Additional handling for two-person items.',30,'Labor','Automatic','PerItem',20.0,true),
  ('disassembly','Disassembly','Item disassembly labor modifier.',31,'Labor','Automatic','PerItem',15.0,true),
  ('special-equipment','Special Equipment','Special equipment charge.',32,'Equipment','Automatic','FlatFee',50.0,true),
  ('after-hours','After Hours','After-hours service charge.',40,'Scheduling','Optional','Percentage',15.0,true),
  ('emergency','Emergency Service','Priority emergency service.',41,'Scheduling','Optional','Percentage',20.0,true),
  ('weekend','Weekend Service','Weekend scheduling modifier.',42,'Scheduling','Optional','Percentage',10.0,true),
  ('holiday','Holiday Service','Holiday scheduling modifier.',43,'Scheduling','Optional','Percentage',25.0,true),
  ('gate-access','Gate Access','Restricted gate access charge.',50,'Access','Optional','FlatFee',20.0,true),
  ('elevator-discount','Elevator Discount','Discount when elevator access reduces labor.',51,'Discount','Optional','Discount',20.0,false),
  ('restricted-parking','Restricted Parking','Restricted parking access charge.',52,'Access','Optional','FlatFee',30.0,true),
  ('refrigerant','Refrigerant Disposal','Refrigerant handling charge.',60,'Disposal','Automatic','PerItem',35.0,true),
  ('mattress','Mattress Disposal','Mattress disposal charge.',61,'Disposal','Automatic','PerItem',25.0,true),
  ('tire','Tire Disposal','Tire disposal charge.',62,'Disposal','Automatic','PerItem',15.0,true),
  ('hazardous','Hazardous Material','Hazardous material handling charge.',63,'Disposal','Automatic','PerItem',50.0,true)
) AS seed(slug,name,description,priority,category,mode,value_type,amount,taxable);

INSERT INTO "rule_conditions" ("id","pricingRuleId","field","operator","value","displayOrder","updatedAt")
SELECT r."id" || ':condition', r."id", seed.field, 'equals', seed.value, 0, CURRENT_TIMESTAMP
FROM "pricing_rules" r
JOIN (VALUES
 ('second-floor','floor','2'),('third-floor','floor','3'),
 ('heavy-lift','itemFlag','requiresTwoPeople'),('disassembly','itemFlag','requiresDisassembly'),
 ('special-equipment','itemFlag','requiresSpecialEquipment'),('refrigerant','itemFlag','refrigerant'),
 ('mattress','itemFlag','mattress'),('tire','itemFlag','tire'),('hazardous','itemFlag','hazardous')
) AS seed(slug,field,value)
ON r."id" LIKE '%:pricing-rule:' || seed.slug;
