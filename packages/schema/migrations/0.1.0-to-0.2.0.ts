import { CURRENT_SCHEMA_VERSION } from "../src/shared.js";

type VersionedRecord = {
  schemaVersion: string;
};

export function migrateSchemaVersion<TRecord extends VersionedRecord>(record: TRecord): TRecord {
  return {
    ...record,
    schemaVersion: CURRENT_SCHEMA_VERSION,
  };
}
