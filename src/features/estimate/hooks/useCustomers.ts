"use client";

import { useState } from "react";


import { createCustomerAction } from "@/app/actions/customers/createCustomer";
import { getCustomerPropertiesAction } from "@/app/actions/customers/getCustomerProperties";
import { updateCustomerAction } from "@/app/actions/customers/updateCustomer";
import { searchCustomerAction } from "@/app/actions/customers/searchCustomer";

import type { Customer } from "@/generated/prisma/client";

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
      const results = await searchCustomerAction(searchText);

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

  async function getProperties(customerId: string) {
    return getCustomerPropertiesAction(customerId);
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
    getProperties,
    clearCustomers,
  };
}
