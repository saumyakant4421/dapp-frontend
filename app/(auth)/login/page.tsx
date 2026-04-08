import LoginForm from "@/components/forms/LoginForm";
import SpotlightCard from "@/components/SpotlightCard";
import Link from "next/link";
import DotGrid from "@/components/DotGrid";

export default function LoginPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center px-6 overflow-hidden bg-black">

      {/* Background */}
      <DotGrid dotSize={3} gap={24} baseColor="#1f1f1f" />

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
        
        <LoginForm />

        <SpotlightCard className="h-[460px] flex flex-col justify-between p-6 rounded-2xl text-white">

          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs px-2 py-1 bg-white/10 rounded-full border border-white/10">
                Secure Process
              </span>
            </div>

            <h2 className="text-lg font-semibold mb-2">
              Brand Authentication
            </h2>

            <p className="text-sm text-neutral-400 mb-4">
              Verified companies can securely access the dashboard by completing wallet identity binding.
            </p>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="text-xs font-semibold text-white/70">01</span>
                <div>
                  <p className="text-sm font-medium">Verification Check</p>
                  <p className="text-xs text-neutral-400">
                    Confirm company approval status.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-xs font-semibold text-white/70">02</span>
                <div>
                  <p className="text-sm font-medium">Company Validation</p>
                  <p className="text-xs text-neutral-400">
                    Cross-check registered identity.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-xs font-semibold text-white/70">03</span>
                <div>
                  <p className="text-sm font-medium">Wallet Binding</p>
                  <p className="text-xs text-neutral-400">
                    Secure MetaMask integration.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-800">
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span>🔒 Encrypted</span>
              <span>🛡️ Verified</span>
            </div>
          </div>

        </SpotlightCard>

      </div>
    </div>
  );
}