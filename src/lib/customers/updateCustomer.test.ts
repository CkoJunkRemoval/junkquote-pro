import { describe, expect, it, vi } from "vitest";

const { update, findFirst } = vi.hoisted(() => ({ update: vi.fn(), findFirst: vi.fn() }));
vi.mock("../prisma", () => ({ prisma: { customer: { update, findFirst } } }));

import { updateCustomer } from "./updateCustomer";

describe("updateCustomer", () => {
  it("sends cleaned editable customer fields to the existing update operation", async () => {
    findFirst.mockResolvedValue({ id: "customer-1" }); update.mockResolvedValue({ id: "customer-1" });
    await updateCustomer("8306c54b-befc-4f2a-aa2e-42a63d0eccaa", { id: "customer-1", firstName: " Jamie ", lastName: " Smith ", phone: " 555-0100 ", email: " jamie@example.com ", notes: " Note " });

    expect(update).toHaveBeenCalledWith({
      where: { id: "customer-1" },
      data: { firstName: "Jamie", lastName: "Smith", phone: "555-0100", email: "jamie@example.com", notes: "Note" },
    });
  });
});
