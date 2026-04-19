import Link from "next/link";

export default function Page() {
  return (
    <div className="min-h-screen bg-black text-white px-6 py-16">
      <div className="max-w-2xl mx-auto rounded-xl border border-white/10 bg-white/5 p-8">
        <h1 className="text-2xl font-semibold">Campaign Details</h1>
        <p className="text-sm text-neutral-400 mt-2">
          Open a campaign from your dashboard to view validation details and involved participants.
        </p>

        <div className="mt-6 flex gap-3">
          <Link href="/dashboard" className="px-4 py-2 rounded-lg bg-white text-black text-sm">
            Brand Dashboard
          </Link>
          <Link href="/influencer/dashboard" className="px-4 py-2 rounded-lg bg-neutral-800 text-white text-sm">
            Influencer Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}