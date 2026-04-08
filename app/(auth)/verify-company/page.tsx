import VerifyCompanyForm from "@/components/forms/verifyCompanyForm";
import Squares from "@/components/Squares";
import Link from "next/link";
import SpotlightCard from "@/components/SpotlightCard";

export default function VerifyCompanyPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center px-6 overflow-hidden">
      
      {/* Background */}
      <div className="fixed inset-0 z-0">
        <Squares 
          direction="diagonal" 
          speed={0.5}
          borderColor="#4a5568"
          squareSize={50}
          hoverFillColor="#1a202c"
        />
      </div>

      {/* Back Button */}
      <Link 
        href="/" 
        className="fixed top-18 left-24 z-20 flex items-center gap-2 text-white hover:text-neutral-300 transition text-sm"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        <span>Back</span>
      </Link>

      {/* Centered Content */}
      <div className="relative z-10 w-full max-w-5xl grid md:grid-cols-2 gap-8 items-stretch">
        
        {/* Form */}
        <VerifyCompanyForm />

        {/* Info Card */}
       <SpotlightCard className="h-[460px] flex flex-col justify-between p-6 rounded-2xl text-white">

  {/* Header */}
  <div>
    <div className="flex items-center gap-2 mb-3">
      <span className="text-xs px-2 py-1 bg-white/10 rounded-full border border-white/10">
        Secure Process
      </span>
    </div>

    <h2 className="text-lg font-semibold mb-2">
      Company Verification
    </h2>

    <p className="text-sm text-neutral-400 mb-4">
      We ensure all registered companies meet authenticity and compliance standards before approval.
    </p>

    {/* Steps */}
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <span className="text-xs font-semibold text-white/70">01</span>
        <div>
          <p className="text-sm font-medium">Submit Details</p>
          <p className="text-xs text-neutral-400">
            Provide official email and company registration data.
          </p>
        </div>
      </div>

      <div className="flex items-start gap-3">
        <span className="text-xs font-semibold text-white/70">02</span>
        <div>
          <p className="text-sm font-medium">Upload Proof</p>
          <p className="text-xs text-neutral-400">
            Incorporation, GST, or relevant legal documentation.
          </p>
        </div>
      </div>

      <div className="flex items-start gap-3">
        <span className="text-xs font-semibold text-white/70">03</span>
        <div>
          <p className="text-sm font-medium">Validation</p>
          <p className="text-xs text-neutral-400">
            Domain ownership & public record verification.
          </p>
        </div>
      </div>

      <div className="flex items-start gap-3">
        <span className="text-xs font-semibold text-white/70">04</span>
        <div>
          <p className="text-sm font-medium">Approval</p>
          <p className="text-xs text-neutral-400">
            Review completed within 24–48 hours.
          </p>
        </div>
      </div>
    </div>
  </div>

  {/* Divider + Footer */}
  <div className="pt-4 border-t border-neutral-800">
    <div className="flex items-center justify-between text-xs text-neutral-400">
      <span>🔒 Encrypted submission</span>
      <span>🛡️ Compliance checked</span>
    </div>
  </div>

</SpotlightCard>

      </div>
    </div>
  );
}