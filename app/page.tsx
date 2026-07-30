import type { Metadata } from "next";
import { Dashboard } from "./dashboard";

export const metadata: Metadata = {
  title: "Estoque Soviético",
  description: "Controle operacional de estoque, vendas e crédito.",
};

export default function Home() {
  return <Dashboard />;
}
