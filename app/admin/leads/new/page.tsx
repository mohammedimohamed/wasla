import { LeadCreate } from "@/src/components/leads/LeadCreate";

export default function AdminNewLeadPage() {
    return <LeadCreate isAdmin={true} />;
}
