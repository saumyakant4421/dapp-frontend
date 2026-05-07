"use client";

import CampaignReportClient from "@/components/campaign/CampaignReportClient";
import { useParams, usePathname } from "next/navigation";
import { useMemo } from "react";

export default function CampaignReportPage() {
  const params = useParams<{ id: string }>();
  const pathname = usePathname();

  const campaignId = useMemo(() => {
    if (typeof params?.id === "string" && params.id) return params.id;
    if (Array.isArray(params?.id) && params.id[0]) return params.id[0];
    const fallback = pathname?.split("/").filter(Boolean).pop();
    return fallback || "";
  }, [params, pathname]);

  return <CampaignReportClient campaignId={campaignId} />;
}
