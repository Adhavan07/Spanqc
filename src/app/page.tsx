import { redirect } from "next/navigation";

/**
 * SPANQC Enterprise Root Route
 * Public marketing site is disabled. Directs authenticated users into Launchpad
 * and routes unauthenticated users directly to the secure enterprise sign-in portal.
 */
export default function RootPage() {
  redirect("/app");
}
