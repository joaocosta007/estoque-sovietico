/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useState } from "react";

type CatalogProduct = {
  name: string;
  priceCents: number;
  photoUrl: string | null;
  available: boolean;
};

const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

// Substitua pelo número comercial no formato internacional, sem +, espaços ou traços.
const WHATSAPP_NUMBER = "5500000000000";

function ProductImage({ product }: { product: CatalogProduct }) {
  if (product.photoUrl) {
    return (
      <img
        src={product.photoUrl}
        alt={`Foto de ${product.name}`}
        className="aspect-square w-full border-b-4 border-[#1A1A1A] bg-gray-200 object-cover"
      />
    );
  }

  return (
    <div
      className="grid aspect-square w-full place-items-center border-b-4 border-[#1A1A1A] bg-gray-200 p-4"
      aria-label={`${product.name} sem foto cadastrada`}
    >
      <span className="border-2 border-[#1A1A1A] px-3 py-2 font-mono text-[10px] font-black uppercase tracking-[0.12em]">
        Imagem não catalogada
      </span>
    </div>
  );
}

function ProductCard({ product }: { product: CatalogProduct }) {
  const message = `Camarada, desejo requisitar o item: ${product.name}`;
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

  return (
    <article
      className={[
        "overflow-hidden rounded-none border-4 border-[#1A1A1A] bg-white shadow-[5px_5px_0px_0px_rgba(26,26,26,1)]",
        product.available ? "" : "bg-gray-300 opacity-70 grayscale",
      ].join(" ")}
    >
      <ProductImage product={product} />
      <div className="p-4">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-lg font-black uppercase leading-[1.05] tracking-[-0.03em]">
            {product.name}
          </h2>
          <span
            className={[
              "shrink-0 -rotate-2 border-2 px-2 py-1 font-mono text-[9px] font-black uppercase tracking-[0.08em]",
              product.available
                ? "border-[#185C35] bg-[#185C35] text-white"
                : "border-[#A91D11] bg-[#A91D11] text-white",
            ].join(" ")}
          >
            {product.available ? "Em estoque" : "Esgotado"}
          </span>
        </div>

        <p className="border-y-2 border-[#1A1A1A] py-3 font-mono text-[10px] font-black uppercase tracking-[0.12em]">
          Preço de venda
        </p>
        <strong className="block py-4 text-3xl font-black tracking-[-0.06em] text-[#A91D11]">
          {moneyFormatter.format(product.priceCents / 100)}
        </strong>

        {product.available ? (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="block rounded-none border-4 border-[#1A1A1A] bg-[#A91D11] px-3 py-4 text-center text-xs font-black uppercase tracking-[0.08em] text-white shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] active:translate-x-1 active:translate-y-1 active:shadow-none"
            aria-label={`Solicitar ${product.name} via WhatsApp`}
          >
            Solicitar via WhatsApp →
          </a>
        ) : (
          <p className="border-4 border-[#1A1A1A] bg-gray-200 px-3 py-4 text-center font-mono text-xs font-black uppercase">
            Aguardando reposição
          </p>
        )}
      </div>
    </article>
  );
}

export function PublicCatalog() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [query, setQuery] = useState("");
  const [showSoldOut, setShowSoldOut] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        // GET público da vitrine: a API retorna apenas nome, preço, foto e disponibilidade.
        const response = await fetch("/api/catalog", {
          signal: controller.signal,
        });
        const result = (await response.json()) as {
          products?: CatalogProduct[];
          error?: string;
        };
        if (!response.ok) {
          throw new Error(result.error || "Não foi possível abrir o catálogo.");
        }
        setProducts(result.products ?? []);
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === "AbortError") {
          return;
        }
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Não foi possível abrir o catálogo.",
        );
      } finally {
        setLoading(false);
      }
    }, 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, []);

  const visibleProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
    return products.filter(
      (product) =>
        (showSoldOut || product.available) &&
        product.name.toLocaleLowerCase("pt-BR").includes(normalizedQuery),
    );
  }, [products, query, showSoldOut]);

  const availableCount = products.filter((product) => product.available).length;

  return (
    <main className="min-h-dvh bg-[#D1D1D1] font-sans text-[#1A1A1A]">
      <div className="mx-auto min-h-dvh max-w-md border-x-4 border-[#1A1A1A] bg-gray-100">
        <div className="h-3 border-b-4 border-[#1A1A1A] bg-[#A91D11]" />

        <header className="border-b-4 border-[#1A1A1A] bg-white px-5 py-7">
          <div className="mb-5 flex items-center justify-between font-mono text-[10px] font-black uppercase tracking-[0.14em]">
            <span>Vitrine pública // 01</span>
            <span className="border-2 border-[#1A1A1A] bg-gray-100 px-2 py-1">
              {loading ? "Consultando" : `${availableCount} disponíveis`}
            </span>
          </div>
          <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-[#A91D11]">
            Armazém central
          </p>
          <h1 className="text-4xl font-black uppercase leading-[0.86] tracking-[-0.06em]">
            Estoque
            <br />
            Soviético
          </h1>
          <p className="mt-5 border-l-4 border-[#A91D11] pl-3 font-mono text-xs font-bold uppercase leading-5">
            Catálogo de suprimentos disponíveis
          </p>
        </header>

        <section className="space-y-4 border-b-4 border-[#1A1A1A] bg-gray-200 p-5">
          <label className="block" htmlFor="catalog-search">
            <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em]">
              Buscar no catálogo
            </span>
            <input
              id="catalog-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="NOME DO PRODUTO"
              className="w-full rounded-none border-4 border-[#1A1A1A] bg-white px-4 py-4 font-mono text-sm font-bold uppercase outline-none shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] placeholder:text-gray-500 focus:bg-yellow-50"
            />
          </label>

          <label className="flex cursor-pointer items-center gap-3 border-2 border-[#1A1A1A] bg-white p-3 font-mono text-[10px] font-black uppercase">
            <input
              type="checkbox"
              checked={showSoldOut}
              onChange={(event) => setShowSoldOut(event.target.checked)}
              className="size-5 rounded-none accent-[#A91D11]"
            />
            Mostrar itens esgotados
          </label>
        </section>

        <section className="space-y-5 px-5 py-6" aria-live="polite">
          <div className="flex items-end justify-between border-b-4 border-[#1A1A1A] pb-3">
            <div>
              <p className="font-mono text-[9px] font-black uppercase text-[#A91D11]">
                Relação pública
              </p>
              <h2 className="text-xl font-black uppercase">Mercadorias</h2>
            </div>
            <strong className="border-2 border-[#1A1A1A] bg-white px-2 py-1 font-mono text-xs">
              {String(visibleProducts.length).padStart(2, "0")}
            </strong>
          </div>

          {loading && (
            <p className="border-4 border-[#1A1A1A] bg-white p-6 text-center font-mono text-xs font-black uppercase shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
              Consultando depósito...
            </p>
          )}

          {error && (
            <p className="border-4 border-[#1A1A1A] bg-[#A91D11] p-5 font-mono text-xs font-black uppercase text-white shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
              Falha de consulta // {error}
            </p>
          )}

          {!loading && !error && visibleProducts.length === 0 && (
            <div className="border-4 border-dashed border-[#1A1A1A] bg-white p-7 text-center">
              <strong className="block text-base font-black uppercase">
                Nenhum item disponível
              </strong>
              <p className="mt-3 font-mono text-xs uppercase leading-5 text-gray-600">
                Tente outra busca ou aguarde a próxima reposição.
              </p>
            </div>
          )}

          {visibleProducts.map((product, index) => (
            <ProductCard
              key={`${product.name}-${product.priceCents}-${index}`}
              product={product}
            />
          ))}
        </section>

        <footer className="border-t-4 border-[#1A1A1A] bg-[#1A1A1A] px-5 py-6 font-mono text-[10px] font-bold uppercase leading-5 text-white">
          Catálogo atualizado conforme o saldo operacional. Consulte a
          disponibilidade final pelo WhatsApp.
        </footer>
      </div>
    </main>
  );
}
