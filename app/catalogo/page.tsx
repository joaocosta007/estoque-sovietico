import type { Metadata } from "next";
import { PublicCatalog } from "./public-catalog";

export const metadata: Metadata = {
  title: "Catálogo do Povo | Estoque Soviético",
  description: "Catálogo público de suprimentos disponíveis.",
};

export default function CatalogPage() {
  return <PublicCatalog />;
}
