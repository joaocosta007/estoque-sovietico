import type { Metadata } from "next";
import { requireAdminPage } from "../lib/auth";
import { Dashboard } from "./dashboard";

export const metadata: Metadata = {
  title: "Estoque Soviético",
  description: "Controle operacional de estoque, vendas e crédito.",
};

export const dynamic = "force-dynamic";

export default async function Home() {
  await requireAdminPage();
  return <Dashboard />;
}
