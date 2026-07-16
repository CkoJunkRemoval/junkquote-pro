"use client";

import { useState } from "react";

import { DEVELOPMENT_COMPANY_ID } from "@/lib/config";

import { createCustomerAction } from "@/app/actions/customers/createCustomer";
import { updateCustomerAction } from "@/app/actions/customers/updateCustomer";
import { searchCustomerAction } from "@/app/actions/customers/searchCustomer";

import type { Customer } from "@prisma/client";

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);

  async function search(searchText: string) {
    if (!searchText.trim()) {
      setCustomers([]);
      return;
    }

    setLoading(true);

    try {
      const results = await searchCustomerAction(
        DEVELOPMENT_COMPANY_ID,
        searchText
      );

      setCustomers(results);
    } catch (error) {
      console.error("Customer search failed:", error);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }

  async function create(data: {
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
    notes?: string;
  }) {
    return createCustomerAction({
      companyId: DEVELOPMENT_COMPANY_ID,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      email: data.email,
      notes: data.notes,
    });
  }

  async function update(data: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
    notes?: string;
  }) {
    return updateCustomerAction(data);
  }

  function clearCustomers() {
    setCustomers([]);
  }

  return {
    customers,
    loading,
    search,
    create,
    update,
    clearCustomers,
  };
}