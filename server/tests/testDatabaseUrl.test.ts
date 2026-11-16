// The guard that stops tests running against the real database.
import { describe, expect, it } from "vitest";
import { databaseIdentity } from "./testDatabaseUrl";

const host = "aws-1-eu-west-2.pooler.supabase.com";

describe("databaseIdentity", () => {
  it("treats two strings for the same project as the same database, whatever the password", () => {
    const a = `postgresql://postgres.aaaaaaaaaaaaaaaaaaaa:Password1@${host}:5432/postgres`;
    const b = `postgresql://postgres.aaaaaaaaaaaaaaaaaaaa:Different2@${host}:5432/postgres`;
    expect(databaseIdentity(a)).toBe(databaseIdentity(b));
  });

  it("tells two different projects apart", () => {
    const main = `postgresql://postgres.aaaaaaaaaaaaaaaaaaaa:Password1@${host}:5432/postgres`;
    const test = `postgresql://postgres.bbbbbbbbbbbbbbbbbbbb:Password1@${host}:5432/postgres`;
    expect(databaseIdentity(main)).not.toBe(databaseIdentity(test));
  });

  it("never includes the password", () => {
    const url = `postgresql://postgres.aaaaaaaaaaaaaaaaaaaa:SuperSecret9@${host}:5432/postgres`;
    expect(databaseIdentity(url)).not.toContain("SuperSecret9");
  });
});
