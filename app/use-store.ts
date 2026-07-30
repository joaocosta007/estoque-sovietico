"use client";

import { useCallback, useEffect, useState } from "react";

export type Product = {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  photoUrl: string | null;
  salePriceCents: number;
  stockMilli: number;
  minStockMilli: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Sale = {
  id: string;
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  paymentMethod: string;
  status: string;
  createdAt: string;
};

type ProductPayload = {
  id?: string;
  sku: string;
  barcode: string;
  name: string;
  photoUrl: string;
  salePriceCents: number;
  initialStockMilli?: number;
  minStockMilli: number;
};

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  const result = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(result.error || "Não foi possível concluir a operação.");
  }
  return result;
}

export function useStore() {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [todayTotalCents, setTodayTotalCents] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setError("");
    try {
      const [productData, saleData] = await Promise.all([
        api<{ products: Product[] }>("/api/products"),
        api<{ sales: Sale[]; todayTotalCents: number }>("/api/sales"),
      ]);
      setProducts(productData.products);
      setSales(saleData.sales);
      setTodayTotalCents(saleData.todayTotalCents);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Falha ao carregar os dados.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  async function createProduct(payload: ProductPayload) {
    await api("/api/products", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    await refresh();
  }

  async function updateProduct(payload: ProductPayload & { id: string }) {
    await api("/api/products", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    await refresh();
  }

  async function deleteProduct(id: string) {
    await api("/api/products", {
      method: "DELETE",
      body: JSON.stringify({ id }),
    });
    await refresh();
  }

  async function addStock(productId: string, quantityMilli: number, note: string) {
    await api("/api/stock", {
      method: "POST",
      body: JSON.stringify({ productId, quantityMilli, note }),
    });
    await refresh();
  }

  async function createSale(
    productId: string,
    quantityMilli: number,
    paymentMethod: string,
  ) {
    const result = await api<{ sale: { id: string; totalCents: number } }>(
      "/api/sales",
      {
        method: "POST",
        body: JSON.stringify({
          items: [{ productId, quantityMilli }],
          paymentMethod,
        }),
      },
    );
    await refresh();
    return result.sale;
  }

  return {
    products,
    sales,
    todayTotalCents,
    loading,
    error,
    refresh,
    createProduct,
    updateProduct,
    deleteProduct,
    addStock,
    createSale,
  };
}
