import { redirect } from "next/navigation";

export default function Home() {
    // Logic to check session could go here
    // For now, simple redirect to login
    redirect("/login");
}
