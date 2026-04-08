"use client";

import { useState } from "react";
import { Company } from "@/types/company";

export default function VerifyCompanyForm() {
  const [form, setForm] = useState<Company>({
    company_name: "",
    official_email: "",
    website: "",
    linkedin: "",
    proof_url: ""
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const res = await fetch("/api/company/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();

    if (data.success) {
      setMessage("Company submitted for verification.");
      setForm({
        company_name: "",
        official_email: "",
        website: "",
        linkedin: "",
        proof_url: ""
      });
    } else {
      setMessage(data.error || "Something went wrong.");
    }

    setLoading(false);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="h-[460px] w-full p-6 bg-white/10 backdrop-blur-md rounded-2xl text-white flex flex-col justify-center space-y-4"
    >
      <h2 className="text-lg font-semibold text-center">
        Company Verification
      </h2>

      <input
        type="text"
        name="company_name"
        placeholder="Company Name"
        value={form.company_name}
        onChange={handleChange}
        required
        className="w-full px-3 py-2 text-sm rounded-lg bg-black/40 border border-neutral-700 focus:outline-none focus:border-white/40"
      />

      <input
        type="email"
        name="official_email"
        placeholder="Official Company Email"
        value={form.official_email}
        onChange={handleChange}
        required
        className="w-full px-3 py-2 text-sm rounded-lg bg-black/40 border border-neutral-700 focus:outline-none focus:border-white/40"
      />

      <input
        type="url"
        name="website"
        placeholder="Company Website"
        value={form.website}
        onChange={handleChange}
        required
        className="w-full px-3 py-2 text-sm rounded-lg bg-black/40 border border-neutral-700 focus:outline-none focus:border-white/40"
      />

      <input
        type="url"
        name="linkedin"
        placeholder="LinkedIn Page (Optional)"
        value={form.linkedin}
        onChange={handleChange}
        className="w-full px-3 py-2 text-sm rounded-lg bg-black/40 border border-neutral-700 focus:outline-none focus:border-white/40"
      />

      <input
        type="text"
        name="proof_url"
        placeholder="Proof Document URL (Optional)"
        value={form.proof_url}
        onChange={handleChange}
        className="w-full px-3 py-2 text-sm rounded-lg bg-black/40 border border-neutral-700 focus:outline-none focus:border-white/40"
      />

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 text-sm bg-white text-black rounded-lg font-semibold hover:bg-neutral-200 transition"
      >
        {loading ? "Submitting..." : "Submit for Verification"}
      </button>

      {message && (
        <p className="text-center text-xs text-neutral-300">
          {message}
        </p>
      )}
    </form>
  );
}