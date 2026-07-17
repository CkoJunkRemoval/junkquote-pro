import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  employeeFindFirst: vi.fn(),
  employeeCreate: vi.fn(),
  employeeUpdate: vi.fn(),
  crewFindFirst: vi.fn(),
  crewCreate: vi.fn(),
  crewUpdate: vi.fn(),
  crewMemberCreate: vi.fn(),
  crewMemberDelete: vi.fn(),
  crewMemberUpdate: vi.fn(),
  crewMemberUpdateMany: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("../prisma", () => ({
  prisma: {
    employee: { findFirst: mocks.employeeFindFirst, create: mocks.employeeCreate, update: mocks.employeeUpdate },
    crew: { findFirst: mocks.crewFindFirst, create: mocks.crewCreate, update: mocks.crewUpdate },
    crewMember: { create: mocks.crewMemberCreate, delete: mocks.crewMemberDelete, update: mocks.crewMemberUpdate, updateMany: mocks.crewMemberUpdateMany },
    $transaction: mocks.transaction,
  },
}));

import { addCrewMember, createEmployee, getCrewDetail, getEmployeeDetail, setCrewLead, setEmployeeStatus, updateCrew, updateEmployee } from "./management";

const activeEmployee = { id: "employee-1", status: "Active", crewMembers: [], assignments: [] };
const crew = { id: "crew-1", members: [{ employeeId: "employee-1", employee: activeEmployee, isLead: false }], assignments: [] };

describe("employee and crew management", () => {
  beforeEach(() => vi.clearAllMocks());

  it("tenant-scopes employee and crew detail lookups", async () => {
    mocks.employeeFindFirst.mockResolvedValue(null);
    mocks.crewFindFirst.mockResolvedValue(null);
    await getEmployeeDetail("employee-1");
    await getCrewDetail("crew-1");
    expect(mocks.employeeFindFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "employee-1", companyId: "8306c54b-befc-4f2a-aa2e-42a63d0eccaa" } }));
    expect(mocks.crewFindFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "crew-1", companyId: "8306c54b-befc-4f2a-aa2e-42a63d0eccaa" } }));
  });

  it("creates and updates cleaned employee fields through the tenant-safe lookup", async () => {
    mocks.employeeCreate.mockResolvedValue({ id: "employee-1" });
    mocks.employeeFindFirst.mockResolvedValue(activeEmployee);
    mocks.employeeUpdate.mockResolvedValue({ id: "employee-1" });
    await createEmployee({ firstName: " Jamie ", lastName: " Smith ", role: "CrewMember", email: " jamie@example.com " });
    await updateEmployee("employee-1", { firstName: " Jamie ", lastName: " Smith ", role: "CrewLead" });
    expect(mocks.employeeCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ companyId: "8306c54b-befc-4f2a-aa2e-42a63d0eccaa", firstName: "Jamie", lastName: "Smith" }) }));
    expect(mocks.employeeUpdate).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "employee-1" }, data: expect.objectContaining({ role: "CrewLead" }) }));
  });

  it("updates employee activation status", async () => {
    mocks.employeeFindFirst.mockResolvedValue(activeEmployee);
    await setEmployeeStatus("employee-1", "Inactive");
    expect(mocks.employeeUpdate).toHaveBeenCalledWith({ where: { id: "employee-1" }, data: { status: "Inactive" } });
  });

  it("updates crew information and adds a selected member", async () => {
    mocks.crewFindFirst.mockResolvedValue(crew);
    mocks.employeeFindFirst.mockResolvedValue(activeEmployee);
    mocks.crewUpdate.mockResolvedValue({ id: "crew-1" });
    mocks.crewMemberCreate.mockResolvedValue({ crewId: "crew-1", employeeId: "employee-1" });
    await updateCrew("crew-1", { name: " North Crew ", color: " #123456 " });
    await addCrewMember("crew-1", "employee-1");
    expect(mocks.crewUpdate).toHaveBeenCalledWith({ where: { id: "crew-1" }, data: { name: "North Crew", color: "#123456" } });
    expect(mocks.crewMemberCreate).toHaveBeenCalledWith({ data: { crewId: "crew-1", employeeId: "employee-1" } });
  });

  it("replaces a crew lead and rejects an inactive member", async () => {
    mocks.crewFindFirst.mockResolvedValue(crew);
    mocks.crewMemberUpdateMany.mockReturnValue("clear-lead");
    mocks.crewMemberUpdate.mockReturnValue("set-lead");
    mocks.transaction.mockResolvedValue([]);
    await setCrewLead("crew-1", "employee-1");
    expect(mocks.crewMemberUpdateMany).toHaveBeenCalledWith({ where: { crewId: "crew-1" }, data: { isLead: false } });
    expect(mocks.crewMemberUpdate).toHaveBeenCalledWith({ where: { crewId_employeeId: { crewId: "crew-1", employeeId: "employee-1" } }, data: { isLead: true } });
    mocks.crewFindFirst.mockResolvedValue({ ...crew, members: [{ ...crew.members[0], employee: { ...activeEmployee, status: "Inactive" } }] });
    await expect(setCrewLead("crew-1", "employee-1")).rejects.toThrow("Crew lead must be an active crew member.");
  });
});
