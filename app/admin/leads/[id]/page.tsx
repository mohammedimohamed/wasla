"use client";

import { useParams } from "next/navigation";
import { LeadCard } from "@/src/components/leads/LeadCard";

export default function AdminLeadDetailPage() {
    const { id } = useParams();
    return <LeadCard id={id as string} isAdmin={true} />;
}
