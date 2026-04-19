"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function CampaignDetailsRedirectPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    const id = typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params.id[0] : "";
    router.replace(id ? `/campaigns/${id}` : "/campaigns");
  }, [params, router]);

  return null;
}
