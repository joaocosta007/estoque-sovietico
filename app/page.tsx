import type { Metadata } from "next";
import { InventoryApp } from "./inventory-app";

export const metadata: Metadata = {
  title: "Estoque Soviético",
  description: "Gestão simples de estoque, vendas e caixa para pequenos negócios.",
};

export default function Home() {
  return <InventoryApp />;
}

