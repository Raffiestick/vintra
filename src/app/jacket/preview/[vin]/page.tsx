import { redirect } from "next/navigation";

export default function JacketPreviewPage({ params }: { params: { vin: string } }) {
  const vin = Array.isArray(params.vin) ? params.vin[0] : params.vin || "";
  if (vin) {
    redirect(`/admin/jackets/${encodeURIComponent(vin)}`);
  } else {
    redirect('/admin/jackets');
  }
}
