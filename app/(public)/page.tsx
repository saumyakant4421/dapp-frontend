"use client";

import Aurora from "@/components/Aurora";
import CardNav from "@/components/CardNav";
import logo from "@/public/logo.svg";
import Link from "next/link";

export default function Home() {

  const items = [
    {
      label: "Influencers",
      bgColor: "#0D0716",
      textColor: "#fff",
      links: [
        { label: "Login", href: "/influencer/login", ariaLabel: "Influencer Login" }
      ]
    },
    {
      label: "Brands",
      bgColor: "#170D27",
      textColor: "#fff",
      links: [
        { label: "Login", href: "/login", ariaLabel: "Brand Login" },
        { label: "Verify Company", href: "/verify-company", ariaLabel: "Verify company" }
      ]
    },
    {
      label: "Campaigns",
      bgColor: "#271E37",
      textColor: "#fff",
      links: [
        { label: "Explore", href: "/campaigns", ariaLabel: "Explore campaigns" }
      ]
    }
  ];

  return (
    <Aurora>

      {/* NAVBAR */}
      <div className="fixed top-0 left-0 w-full z-50">
        <CardNav
          logo={logo}
          logoAlt="Platform Logo"
          items={items}
          baseColor="#ffffff"
          menuColor="#000000"
          buttonBgColor="#111111"
          buttonTextColor="#ffffff"
          ease="power3.out"
        />
      </div>

      {/* HERO */}
      <section className="relative z-10 flex min-h-screen items-center justify-center px-6 text-white text-center top-16">
        <div className="max-w-4xl">

          <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-tight">
            Transparent Campaign Payouts
            <br />
            <span className="text-neutral-300">
              Powered by Blockchain
            </span>
          </h1>

          <p className="mt-8 text-lg md:text-xl text-neutral-300 max-w-2xl mx-auto">
            A secure infrastructure where verified brands launch campaigns,
            influencers participate, and rewards are distributed automatically
            through smart contracts.
          </p>

          <div className="mt-12 flex flex-col sm:flex-row gap-6 justify-center">

            <Link
              href="/login"
              className="rounded-full bg-white text-black px-8 py-4 font-semibold hover:bg-neutral-200 transition"
            >
              Brand Login
            </Link>

            <Link
              href="/influencer/login"
              className="rounded-full border border-white px-8 py-4 font-semibold hover:bg-white hover:text-black transition"
            >
              Influencer Login
            </Link>

            <Link
              href="/campaigns"
              className="rounded-full border border-white px-8 py-4 font-semibold hover:bg-white hover:text-black transition"
            >
              Explore Campaigns
            </Link>

          </div>

          <p className="mt-6 text-sm text-neutral-400">
            Verified brands · Transparent payouts · Smart contract automation
          </p>

        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 py-12 text-center text-neutral-500 text-sm">
        © {new Date().getFullYear()} Transparent Campaign Platform · Built with Next.js & Web3
      </footer>

    </Aurora>
  );
}