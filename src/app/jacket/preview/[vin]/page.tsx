// @ts-nocheck
import { redirect } from "next/navigation";

export default function Page({ params }: any) {
  const raw = params?.vin;
  const vin = Array.isArray(raw) ? raw[0] : raw || "";
  redirect(`/admin/jackets/${encodeURIComponent(vin)}`);
}

    