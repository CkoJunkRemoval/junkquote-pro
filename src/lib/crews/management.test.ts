import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  employeeFindFirst: vi.fn(),
  employeeCreate: vi.fn(),
  employeeUpdate: vi.fn(),
  crewFindFirst: vi.fn(),
  employeeFindMany: vi.fn(),
  employeeCount: vi.fn(),
  crewFindMany: vi.fn(),
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
    employee: { findFirst: mocks.employeeFindFirst, findMany: mocks.employeeFindMany, count: mocks.employeeCount, create: mocks.employeeCreate, update: mocks.employeeUpdate },
    crew: { findFirst: mocks.crewFindFirst, findMany: mocks.crewFindMany, create: mocks.crewCreate, update: mocks.crewUpdate },
    crewMember: { create: mocks.crewMemberCreate, delete: mocks.crewMemberDelete, update: mocks.crewMemberUpdate, updateMany: mocks.crewMemberUpdateMany },
    $transaction: mocks.transaction,
  },
}));

import { addCrewMember, createEmployee, getCrewDetail, getEmployeeDetail, listCrews, listEmployees, setCrewLead, setEmployeeStatus, updateCrew, updateEmployee } from "./management";

const activeEmployee = { id: "employee-1", status: "Active", crewMembers: [], assignments: [] };
const crew = { id: "crew-1", members: [{ employeeId: "employee-1", employee: activeEmployee, isLead: false }], assignments: [] };

describe("employee and crew management", () => {
  beforeEach(() => vi.clearAllMocks());

  it("tenant-scopes employee and crew detail lookups", async () => {
    mocks.employeeFindFirst.mockResolvedValue(null);
    mocks.crewFindFirst.mockResolvedValue(null);
    await getEmployeeDetail("tenant-a", "employee-1");
    await getCrewDetail("tenant-a", "crew-1");
    expect(mocks.employeeFindFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "employee-1", companyId: "tenant-a" } }));
    expect(mocks.crewFindFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "crew-1", companyId: "tenant-a" } }));
  });

  it("tenant-scopes employee and crew lists", async () => {
    mocks.employeeFindMany.mockReturnValue("employees"); mocks.employeeCount.mockReturnValue("count"); mocks.transaction.mockResolvedValue([[], 0]); mocks.crewFindMany.mockResolvedValue([]);
    await listEmployees("tenant-a", { status: "Active" }); await listCrews("tenant-a", true);
    expect(mocks.employeeFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ companyId: "tenant-a", status: "Active" }) }));
    expect(mocks.crewFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { companyId: "tenant-a", active: true } }));
  });

  it("creates and updates cleaned employee fields through the tenant-safe lookup", async () => {
    mocks.employeeCreate.mockResolvedValue({ id: "employee-1" });
    mocks.employeeFindFirst.mockResolvedValue(activeEmployee);
    mocks.employeeUpdate.mockResolvedValue({ id: "employee-1" });
    await createEmployee("tenant-a", { firstName: " Jamie ", lastName: " Smith ", role: "CrewMember", email: " jamie@example.com " });
    await updateEmployee("tenant-a", "employee-1", { firstName: " Jamie ", lastName: " Smith ", role: "CrewLead" });
    expect(mocks.employeeCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ companyId: "tenant-a", firstName: "Jamie", lastName: "Smith" }) }));
    expect(mocks.employeeUpdate).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "employee-1" }, data: expect.objectContaining({ role: "CrewLead" }) }));
  });

  it("updates employee activation status", async () => {
    mocks.employeeFindFirst.mockResolvedValue(activeEmployee);
    await setEmployeeStatus("tenant-a", "employee-1", "Inactive");
    expect(mocks.employeeUpdate).toHaveBeenCalledWith({ where: { id: "employee-1" }, data: { status: "Inactive" } });
  });

  it("updates crew information and adds a selected member", async () => {
    mocks.crewFindFirst.mockResolvedValue(crew);
    mocks.employeeFindFirst.mockResolvedValue(activeEmployee);
    mocks.crewUpdate.mockResolvedValue({ id: "crew-1" });
    mocks.crewMemberCreate.mockResolvedValue({ crewId: "crew-1", employeeId: "employee-1" });
    await updateCrew("tenant-a", "crew-1", { name: " North Crew ", color: " #123456 " });
    await addCrewMember("tenant-a", "crew-1", "employee-1");
    expect(mocks.crewUpdate).toHaveBeenCalledWith({ where: { id: "crew-1" }, data: { name: "North Crew", color: "#123456" } });
    expect(mocks.crewMemberCreate).toHaveBeenCalledWith({ data: { crewId: "crew-1", employeeId: "employee-1" } });
  });

  it("replaces a crew lead and rejects an inactive member", async () => {
    mocks.crewFindFirst.mockResolvedValue(crew);
    mocks.crewMemberUpdateMany.mockReturnValue("clear-lead");
    mocks.crewMemberUpdate.mockReturnValue("set-lead");
    mocks.transaction.mockResolvedValue([]);
    await setCrewLead("tenant-a", "crew-1", "employee-1");
    expect(mocks.crewMemberUpdateMany).toHaveBeenCalledWith({ where: { crewId: "crew-1", crew: { companyId: "tenant-a" } }, data: { isLead: false } });
    expect(mocks.crewMemberUpdate).toHaveBeenCalledWith({ where: { crewId_employeeId: { crewId: "crew-1", employeeId: "employee-1" } }, data: { isLead: true } });
    mocks.crewFindFirst.mockResolvedValue({ ...crew, members: [{ ...crew.members[0], employee: { ...activeEmployee, status: "Inactive" } }] });
    await expect(setCrewLead("tenant-a", "crew-1", "employee-1")).rejects.toThrow("Crew lead must be an active crew member.");
  });

  it("rejects cross-tenant employee and crew updates", async () => {
    mocks.employeeFindFirst.mockResolvedValue(null); mocks.crewFindFirst.mockResolvedValue(null);
    await expect(updateEmployee("tenant-a", "employee-b", { firstName: "B", lastName: "User", role: "CrewMember" })).rejects.toThrow("Employee not found");
    await expect(updateCrew("tenant-a", "crew-b", { name: "B" })).rejects.toThrow("Crew not found");
    expect(mocks.employeeUpdate).not.toHaveBeenCalled(); expect(mocks.crewUpdate).not.toHaveBeenCalled();
  });
});
