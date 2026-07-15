// External-system adapter for CMS (Contract Management System).
//
// The source HRS pushes contracts/people/legal-entities/contract-types to an
// external CMS and writes back the returned UUIDs into mapping tables. CMS is
// not available in local dev, so we use a STUB adapter that logs and returns
// deterministic fake UUIDs. To integrate the real CMS later, implement this
// interface with real HTTP calls — no other code changes needed.
//
// (QIS — the employee push target — is also a placeholder in the source report.)

export interface CmsPersonInput {
  employeeId: number;
  name: string;
  email?: string | null;
  idDocumentNumber?: string | null;
}

export interface CmsLegalEntityInput {
  legalEntityId: number;
  entityName: string;
  registerNumber: string;
}

export interface CmsContractTypeInput {
  contractTypeId: number;
  code: string;
  name: string;
}

export interface CmsContractInput {
  contractNo: string;
  title?: string | null;
  personUuid: string;
  legalEntityUuids: string[];
  contractTypeUuid: string;
  signDate?: string | null;
  effectiveDate?: string | null;
  expireDate?: string | null;
}

export interface CmsAdapter {
  createPerson(input: CmsPersonInput): Promise<string>;
  createLegalEntity(input: CmsLegalEntityInput): Promise<string>;
  createContractType(input: CmsContractTypeInput): Promise<string>;
  createContract(input: CmsContractInput): Promise<string>;
}

/** Deterministic pseudo-UUID generator (no Math.random — stable per identity). */
function fakeUuid(kind: string, id: number | string): string {
  const s = `${kind}:${id}`;
  // simple deterministic hash → hex
  let h1 = 0x10000, h2 = 0x20000;
  for (let i = 0; i < s.length; i++) {
    h1 = (h1 * 31 + s.charCodeAt(i)) >>> 0;
    h2 = (h2 * 37 + s.charCodeAt(i) * 7) >>> 0;
  }
  const hex = (h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0")).padEnd(16, "0");
  const p = (n: number) => hex.slice(n, n + 4);
  return `${hex.slice(0, 8)}-${p(0)}-${p(4)}-${p(8)}-${"0".repeat(4)}${hex.slice(0, 8)}`.slice(0, 36);
}

export class StubCmsAdapter implements CmsAdapter {
  private log(kind: string, payload: unknown) {
    if (process.env.HRS_LOG_CMS === "1") {
      // eslint-disable-next-line no-console
      console.log(`[CMS-STUB] ${kind}:`, JSON.stringify(payload));
    }
  }

  async createPerson(input: CmsPersonInput): Promise<string> {
    this.log("createPerson", input);
    return fakeUuid("person", input.employeeId);
  }

  async createLegalEntity(input: CmsLegalEntityInput): Promise<string> {
    this.log("createLegalEntity", input);
    return fakeUuid("legalEntity", input.legalEntityId);
  }

  async createContractType(input: CmsContractTypeInput): Promise<string> {
    this.log("createContractType", input);
    return fakeUuid("contractType", input.contractTypeId);
  }

  async createContract(input: CmsContractInput): Promise<string> {
    this.log("createContract", input);
    return fakeUuid("contract", input.contractNo);
  }
}

/** Active adapter — swap to a real HTTP impl in production. */
export const cms: CmsAdapter = new StubCmsAdapter();
