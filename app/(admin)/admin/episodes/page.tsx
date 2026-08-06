import { redirect } from "next/navigation"

export default function EpisodesAdminRedirectPage() {
  redirect("/admin/shows")
}
