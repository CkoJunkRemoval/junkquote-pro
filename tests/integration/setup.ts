import "dotenv/config";
import { requireSafeTestDatabaseUrl } from "../../scripts/test-db-safety.mjs";

const { testValue } = requireSafeTestDatabaseUrl();
process.env.DATABASE_URL = testValue;
