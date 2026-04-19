"use client";

import { useState } from "react";
import type { Company, CompanyCheckResponse, CompanySubmitResponse } from "@/types/company";
import { isCompanyEmail } from "@/lib/validators";

type StatusTone = "neutral" | "success" | "warning" | "error";

const initialForm: Company = {
  company_name: "",
  official_email: "",
  website: "",
  linkedin: "",
  proof_url: "",
};

export default function VerifyCompanyForm() {
  const [form, setForm] = useState<Company>(initialForm);

  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<StatusTone>("neutral");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const checkCompanyStatus = async () => {
    const companyName = form.company_name.trim();

    if (!companyName) {
      setTone("error");
      setMessage("Enter a company name to check verification status.");
      return;
    }

    setChecking(true);
    setMessage("");

    try {
      const res = await fetch("/api/company/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_name: companyName }),
      });

      const data = (await res.json()) as CompanyCheckResponse;

      if (!res.ok) {
        setTone("error");
        setMessage(data.message || "Unable to check company status.");
        return;
      }

      if (data.verified) {
        setTone("success");
        setMessage("This company is already verified. You can proceed to login.");
        return;
      }

      if (data.pending) {
        setTone("warning");
        setMessage("A verification request is already pending for this company.");
        return;
      }

      setTone("neutral");
      setMessage("No verification found. You can submit your details below.");
    } catch {
      setTone("error");
      setMessage("Server error while checking company status.");
    } finally {
      setChecking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isCompanyEmail(form.official_email.trim().toLowerCase())) {
      setTone("error");
      setMessage("Use an official company email (no public email providers).");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const payload: Company = {
        company_name: form.company_name.trim(),
        official_email: form.official_email.trim().toLowerCase(),
        website: form.website.trim(),
        linkedin: form.linkedin?.trim() || "",
        proof_url: form.proof_url?.trim() || "",
      };

      const res = await fetch("/api/company/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as CompanySubmitResponse;

      if (res.ok && data.success) {
        setTone("success");
        setMessage(data.message || "Company submitted for verification.");
        setForm(initialForm);
        return;
      }

      setTone("error");
      setMessage(data.message || "Something went wrong.");
    } catch {
      setTone("error");
      setMessage("Server error while submitting verification request.");
    } finally {
      setLoading(false);
    }
  };

  const toneClass =
    tone === "success"
      ? "text-emerald-300"
      : tone === "warning"
      ? "text-amber-300"
      : tone === "error"
      ? "text-red-300"
      : "text-neutral-300";

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

      <button
        type="button"
        onClick={checkCompanyStatus}
        disabled={checking || loading}
        className="w-full py-2 text-xs bg-neutral-800 rounded-lg font-medium hover:bg-neutral-700 transition disabled:opacity-60"
      >
        {checking ? "Checking status..." : "Check company status"}
      </button>

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
        disabled={loading || checking}
        className="w-full py-2.5 text-sm bg-white text-black rounded-lg font-semibold hover:bg-neutral-200 transition disabled:opacity-60"
      >
        {loading ? "Submitting..." : "Submit for Verification"}
      </button>

      {message && (
        <p className={`text-center text-xs ${toneClass}`}>
          {message}
        </p>
      )}
    </form>
  );
}