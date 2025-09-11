import { redirect } from "next/navigation";

export default function Page({ params }: { params: { vin: string }}) {
  redirect(`/admin/jackets/${encodeURIComponent(params.vin)}`);
}

    