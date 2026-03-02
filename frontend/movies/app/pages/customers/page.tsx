"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Customer = {
  customer_id: number;
  first_name: string;
  last_name: string;
  email: string | null;
  active: number;
  create_date: string;
};

const API_BASE = "/api";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchType, setSearchType] = useState("customer_id");
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [addressId, setAddressId] = useState("");
  const [storeId, setStoreId] = useState("1");
  const [active, setActive] = useState("1");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const loadCustomers = async (nextPage = page, nextQuery = query, nextType = searchType) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(nextPage));
      params.set("page_size", String(pageSize));
      if (nextQuery) {
        params.set("q", nextQuery);
        params.set("type", nextType);
      }

      const res = await fetch(`${API_BASE}/customers?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to load customers");
      }
      setCustomers(data.data || []);
      setTotal(Number(data.total) || 0);
    } catch (err: any) {
      setError(err.message || "Failed to load customers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [page, query, searchType]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setError(null);
    const trimmed = searchInput.trim();

    if (searchType === "customer_id" && trimmed && !/^\d+$/.test(trimmed)) {
      setError("Customer ID must be a number.");
      return;
    }

    setPage(1);
    setQuery(trimmed);
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setError(null);

    if (!firstName.trim() || !lastName.trim() || !addressId.trim()) {
      setError("First name, last name, and address ID are required.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim() || null,
          address_id: addressId.trim(),
          store_id: storeId.trim() || 1,
          active: active.trim() || 1,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to add customer");
      }

      setMessage(`Customer added (ID: ${data.customer_id}).`);
      setFirstName("");
      setLastName("");
      setEmail("");
      setAddressId("");
      setStoreId("1");
      setActive("1");
      setPage(1);
      setQuery("");
      setSearchInput("");
      await loadCustomers(1, "", searchType);
    } catch (err: any) {
      setError(err.message || "Failed to add customer");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8 font-sans">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-yellow-400">Customers</h1>
        <Link
          href="/"
          className="border border-yellow-500 text-yellow-400 hover:bg-yellow-500 hover:text-black font-bold py-2 px-4 rounded transition"
        >
          Back to Home
        </Link>
      </div>

      <form onSubmit={handleSearch} className="flex flex-wrap gap-4 mb-6 bg-gray-800 p-4 rounded-lg">
        <select
          value={searchType}
          onChange={(e) => setSearchType(e.target.value)}
          className="bg-gray-700 text-white p-2 rounded border border-gray-600"
        >
          <option value="customer_id">Customer ID</option>
          <option value="first_name">First Name</option>
          <option value="last_name">Last Name</option>
        </select>

        <input
          type="text"
          placeholder="Search..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="flex-1 min-w-[200px] bg-gray-700 text-white p-2 rounded border border-gray-600 placeholder-gray-400"
        />

        <button
          type="submit"
          className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2 px-6 rounded transition"
        >
          Search
        </button>

        <button
          type="button"
          onClick={() => {
            setSearchInput("");
            setQuery("");
            setPage(1);
          }}
          className="border border-gray-500 hover:border-gray-400 text-gray-200 font-bold py-2 px-6 rounded transition"
        >
          Clear
        </button>
      </form>

      <div className="flex gap-8">
        <div className="w-2/3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold border-b border-gray-700 pb-2">Customers</h2>
            <div className="flex items-center gap-3 text-sm text-gray-300">
              <button
                className="px-3 py-1 rounded border border-gray-600 disabled:opacity-40"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Prev
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                className="px-3 py-1 rounded border border-gray-600 disabled:opacity-40"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-gray-400">Loading...</div>
          ) : error ? (
            <div className="text-red-400">{error}</div>
          ) : (
            <div className="space-y-2">
              {customers.map((c) => (
                <div
                  key={c.customer_id}
                  className="p-4 rounded border border-gray-700 bg-gray-800"
                >
                  <div className="flex justify-between items-center">
                    <div className="font-bold">
                      {c.first_name} {c.last_name}
                    </div>
                    <div className="text-sm text-gray-400">ID: {c.customer_id}</div>
                  </div>
                  <div className="text-sm text-gray-400 mt-1">
                    {c.email || "No email"} • Active: {c.active ? "Yes" : "No"}
                  </div>
                </div>
              ))}
              {customers.length === 0 && (
                <p className="text-gray-500 italic">No customers found.</p>
              )}
            </div>
          )}
        </div>

        <div className="w-1/3 bg-gray-800 p-6 rounded-lg border border-gray-700 h-fit sticky top-8">
          <h2 className="text-xl font-semibold mb-4 text-green-400">Add Customer</h2>
          <form onSubmit={handleAddCustomer} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white"
                placeholder="First name"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white"
                placeholder="Last name"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Email (optional)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white"
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Address ID</label>
              <input
                type="number"
                value={addressId}
                onChange={(e) => setAddressId(e.target.value)}
                className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white"
                placeholder="e.g. 1"
              />
            </div>
            <div className="flex gap-3">
              <div className="w-1/2">
                <label className="block text-sm text-gray-400 mb-1">Store ID</label>
                <input
                  type="number"
                  value={storeId}
                  onChange={(e) => setStoreId(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white"
                />
              </div>
              <div className="w-1/2">
                <label className="block text-sm text-gray-400 mb-1">Active (1/0)</label>
                <input
                  type="number"
                  value={active}
                  onChange={(e) => setActive(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold py-2 px-4 rounded transition"
            >
              {submitting ? "Adding..." : "Add Customer"}
            </button>
          </form>

          {message && (
            <div className="mt-4 p-3 rounded text-center bg-green-900/50 text-green-200">
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
