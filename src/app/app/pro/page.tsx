import { redirect } from "next/navigation";

/** Old address for the pricing page. */
export default function ProRedirect() {
  redirect("/app/plans");
}
