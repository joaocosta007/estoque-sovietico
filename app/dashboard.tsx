"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { DataCard, PrimaryButton, TextInput } from "./components/ui";
import type { Product, Sale } from "./use-store";
import { useStore } from "./use-store";

const navigation = [
  { id: "painel", icon: "▦", label: "Painel" },
  { id: "vendas", icon: "+", label: "Vendas" },
  { id: "estoque", icon: "▤", label: "Estoque" },
  { id: "menu", icon: "≡", label: "Menu" },
] as const;

type NavigationId = (typeof navigation)[number]["id"];
type Navigate = (destination: NavigationId, notice?: string) => void;

const screenLabels: Record<NavigationId, string> = {
  painel: "Controle central",
  vendas: "Posto de vendas",
  estoque: "Controle de materiais",
  menu: "Diretório administrativo",
};

const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function formatMoney(cents: number) {
  return moneyFormatter.format(cents / 100);
}

function formatQuantity(milli: number) {
  const value = milli / 1000;
  return Number.isInteger(value)
    ? String(value)
    : value.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
}

function parseDecimal(value: string) {
  const normalized = value.trim().replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function ScreenTitle({
  code,
  title,
  description,
}: {
  code: string;
  title: string;
  description: string;
}) {
  return (
    <div className="border-b-4 border-[#1A1A1A] pb-3">
      <p className="font-mono text-[10px] font-black uppercase tracking-[0.16em] text-[#A91D11]">
        {code}
      </p>
      <h2 className="mt-1 text-2xl font-black uppercase leading-none tracking-[-0.04em]">
        {title}
      </h2>
      <p className="mt-2 font-mono text-xs uppercase leading-5 text-gray-700">
        {description}
      </p>
    </div>
  );
}

function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="border-4 border-dashed border-[#1A1A1A] bg-white p-5 text-center">
      <strong className="block text-sm font-black uppercase">{title}</strong>
      <p className="mt-2 font-mono text-xs uppercase leading-5 text-gray-600">
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function PanelScreen({
  products,
  sales,
  todayTotalCents,
  navigate,
}: {
  products: Product[];
  sales: Sale[];
  todayTotalCents: number;
  navigate: Navigate;
}) {
  const lowStock = products.filter(
    (product) => product.stockMilli <= product.minStockMilli,
  );
  const hasProducts = products.length > 0;

  return (
    <section className="space-y-5 px-4 py-5" aria-label="Painel operacional">
      <section
        className="rounded-none border-4 border-[#1A1A1A] bg-[#A91D11] p-4 text-white shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]"
        aria-labelledby="alertas-criticos"
      >
        <div className="mb-4 flex items-center justify-between border-b-2 border-white pb-2">
          <h2
            id="alertas-criticos"
            className="text-sm font-black uppercase tracking-[0.12em]"
          >
            {hasProducts ? "Alertas críticos" : "Base de dados vazia"}
          </h2>
          <span className="border-2 border-white px-2 py-1 font-mono text-xs font-black">
            {String(lowStock.length).padStart(2, "0")}
          </span>
        </div>
        <p className="font-mono text-sm uppercase leading-5">
          {hasProducts
            ? lowStock.length > 0
              ? `${lowStock.length} item(ns) no ponto de reposição.`
              : "Nenhum produto exige reposição agora."
            : "Cadastre o primeiro produto para iniciar a operação."}
        </p>
        <button
          className="mt-4 rounded-none border-2 border-white bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-[#A91D11]"
          onClick={() => navigate("estoque")}
        >
          {hasProducts ? "Ver inventário →" : "Cadastrar produto →"}
        </button>
      </section>

      <div className="grid grid-cols-2 gap-4">
        <DataCard title="Faturamento hoje" index="KPI-01">
          <p className="font-mono text-[10px] font-bold uppercase text-gray-600">
            TOTAL CONFIRMADO
          </p>
          <strong className="mt-3 block text-[1.55rem] font-black leading-none tracking-[-0.06em]">
            {formatMoney(todayTotalCents)}
          </strong>
          <p className="mt-3 border-t-2 border-[#1A1A1A] pt-2 font-mono text-[10px] font-bold">
            {sales.length} VENDA(S)
          </p>
        </DataCard>

        <DataCard title="Clientes fiado" index="KPI-02">
          <p className="font-mono text-[10px] font-bold uppercase text-gray-600">
            PRÓXIMO MÓDULO
          </p>
          <strong className="mt-3 block text-[1.55rem] font-black leading-none text-[#A91D11]">
            {formatMoney(0)}
          </strong>
          <p className="mt-3 border-t-2 border-[#1A1A1A] pt-2 font-mono text-[10px] font-bold">
            00 CADASTROS
          </p>
        </DataCard>
      </div>

      <div className="grid grid-cols-[1fr_88px] gap-4">
        <PrimaryButton onClick={() => navigate("vendas")}>
          + Registrar venda
        </PrimaryButton>
        <button
          aria-label="Abrir busca de produto"
          className="rounded-none border-4 border-[#1A1A1A] bg-white text-2xl font-black shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] active:translate-x-1 active:translate-y-1 active:shadow-none"
          onClick={() => navigate("estoque")}
        >
          [▥]
        </button>
      </div>

      <DataCard title="Vendas recentes" index="REG-07">
        {sales.length === 0 ? (
          <EmptyState
            title="Nenhuma venda"
            description="Os registros aparecerão aqui após a primeira operação."
          />
        ) : (
          <div className="divide-y-2 divide-[#1A1A1A] border-y-2 border-[#1A1A1A] font-mono text-xs">
            {sales.slice(0, 5).map((sale) => (
              <div
                className="grid grid-cols-[1fr_auto] gap-2 py-3"
                key={sale.id}
              >
                <span>
                  #{sale.id.slice(0, 8).toUpperCase()}
                  {" // "}
                  {new Date(sale.createdAt.replace(" ", "T") + "Z").toLocaleString(
                    "pt-BR",
                    { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" },
                  )}
                </span>
                <strong>+{formatMoney(sale.totalCents)}</strong>
              </div>
            ))}
          </div>
        )}
      </DataCard>
    </section>
  );
}

function SalesScreen({
  products,
  createSale,
  navigate,
  notify,
}: {
  products: Product[];
  createSale: (
    productId: string,
    quantityMilli: number,
    paymentMethod: string,
  ) => Promise<{ id: string; totalCents: number }>;
  navigate: Navigate;
  notify: (message: string) => void;
}) {
  const [selectedId, setSelectedId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const selected = products.find((product) => product.id === selectedId);
  const quantityNumber = parseDecimal(quantity) ?? 0;
  const totalCents = selected
    ? Math.round(selected.salePriceCents * quantityNumber)
    : 0;

  async function submitSale(event: FormEvent) {
    event.preventDefault();
    if (!selected || quantityNumber <= 0) {
      setError("Selecione um produto e informe uma quantidade válida.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const sale = await createSale(
        selected.id,
        Math.round(quantityNumber * 1000),
        paymentMethod,
      );
      setQuantity("1");
      setSelectedId("");
      notify(`VENDA ${sale.id.slice(0, 8)} REGISTRADA`);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Falha na venda.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-5 px-4 py-5" aria-label="Registro de venda">
      <ScreenTitle
        code="MOD-VEN // 02"
        title="Nova venda"
        description="Selecione um produto e confirme o recebimento."
      />

      {products.length === 0 ? (
        <EmptyState
          title="Nenhum produto disponível"
          description="Cadastre o estoque antes de registrar a primeira venda."
          action={
            <PrimaryButton onClick={() => navigate("estoque")}>
              Cadastrar produto
            </PrimaryButton>
          }
        />
      ) : (
        <form className="space-y-5" onSubmit={submitSale}>
          <DataCard title="Selecionar mercadoria" index="ITM-01">
            <div className="max-h-64 overflow-y-auto border-y-2 border-[#1A1A1A]">
              {products.map((product) => {
                const isSelected = product.id === selectedId;
                return (
                  <button
                    type="button"
                    key={product.id}
                    className={[
                      "grid w-full grid-cols-[1fr_auto] gap-3 rounded-none border-b-2 border-[#1A1A1A] p-3 text-left last:border-b-0",
                      isSelected
                        ? "bg-[#A91D11] text-white"
                        : "bg-white text-[#1A1A1A]",
                    ].join(" ")}
                    onClick={() => setSelectedId(product.id)}
                  >
                    <span>
                      <strong className="block text-xs font-black uppercase">
                        {product.name}
                      </strong>
                      <small className="font-mono text-[10px]">
                        {product.sku}
                        {" // "}
                        {formatMoney(product.salePriceCents)}
                      </small>
                    </span>
                    <strong className="self-center font-mono text-xs">
                      {formatQuantity(product.stockMilli)} UN.
                    </strong>
                  </button>
                );
              })}
            </div>
          </DataCard>

          <TextInput
            label="Quantidade"
            name="sale-quantity"
            inputMode="decimal"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
          />

          <label className="block">
            <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em]">
              Forma de pagamento
            </span>
            <select
              className="w-full rounded-none border-4 border-[#1A1A1A] bg-white px-4 py-3 font-mono text-sm shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]"
              value={paymentMethod}
              onChange={(event) => setPaymentMethod(event.target.value)}
            >
              <option value="pix">PIX</option>
              <option value="cash">DINHEIRO</option>
              <option value="card">CARTÃO</option>
            </select>
          </label>

          <DataCard title="Total da operação" index="CX-01">
            <strong className="text-3xl font-black">{formatMoney(totalCents)}</strong>
          </DataCard>

          {error && (
            <p className="border-4 border-[#1A1A1A] bg-[#A91D11] p-3 font-mono text-xs font-black uppercase text-white">
              ERRO // {error}
            </p>
          )}

          <PrimaryButton className="w-full" type="submit" disabled={busy}>
            {busy ? "Processando..." : "Salvar venda"}
          </PrimaryButton>
        </form>
      )}
    </section>
  );
}

type ProductFormState = {
  name: string;
  sku: string;
  barcode: string;
  photoUrl: string;
  price: string;
  initialStock: string;
  minStock: string;
};

const emptyProductForm: ProductFormState = {
  name: "",
  sku: "",
  barcode: "",
  photoUrl: "",
  price: "",
  initialStock: "0",
  minStock: "0",
};

function StockScreen({
  products,
  createProduct,
  updateProduct,
  deleteProduct,
  addStock,
  notify,
}: {
  products: Product[];
  createProduct: (payload: {
    sku: string;
    barcode: string;
    name: string;
    photoUrl: string;
    salePriceCents: number;
    initialStockMilli: number;
    minStockMilli: number;
  }) => Promise<void>;
  updateProduct: (payload: {
    id: string;
    sku: string;
    barcode: string;
    name: string;
    photoUrl: string;
    salePriceCents: number;
    minStockMilli: number;
  }) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addStock: (
    productId: string,
    quantityMilli: number,
    note: string,
  ) => Promise<void>;
  notify: (message: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [editingId, setEditingId] = useState("");
  const [formOpen, setFormOpen] = useState(products.length === 0);
  const [form, setForm] = useState<ProductFormState>(emptyProductForm);
  const [entryQuantity, setEntryQuantity] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const visibleProducts = useMemo(
    () =>
      products.filter((product) =>
        `${product.sku} ${product.name} ${product.barcode ?? ""}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [products, query],
  );
  const selected = products.find((product) => product.id === selectedId);
  const lowStock = products.filter(
    (product) => product.stockMilli <= product.minStockMilli,
  ).length;

  function setField(field: keyof ProductFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function openCreate() {
    setEditingId("");
    setForm(emptyProductForm);
    setFormOpen(true);
    setError("");
  }

  function openEdit(product: Product) {
    setEditingId(product.id);
    setForm({
      name: product.name,
      sku: product.sku,
      barcode: product.barcode ?? "",
      photoUrl: product.photoUrl ?? "",
      price: (product.salePriceCents / 100).toFixed(2).replace(".", ","),
      initialStock: "0",
      minStock: formatQuantity(product.minStockMilli),
    });
    setFormOpen(true);
    setError("");
  }

  async function submitProduct(event: FormEvent) {
    event.preventDefault();
    const price = parseDecimal(form.price);
    const initialStock = parseDecimal(form.initialStock);
    const minStock = parseDecimal(form.minStock);
    if (
      !form.name.trim() ||
      !form.sku.trim() ||
      price === null ||
      initialStock === null ||
      minStock === null
    ) {
      setError("Preencha nome, SKU, preço e quantidades corretamente.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const common = {
        name: form.name,
        sku: form.sku,
        barcode: form.barcode,
        photoUrl: form.photoUrl,
        salePriceCents: Math.round(price * 100),
        minStockMilli: Math.round(minStock * 1000),
      };
      if (editingId) {
        await updateProduct({ ...common, id: editingId });
        notify("PRODUTO ATUALIZADO");
      } else {
        await createProduct({
          ...common,
          initialStockMilli: Math.round(initialStock * 1000),
        });
        notify("PRODUTO CADASTRADO");
      }
      setFormOpen(false);
      setForm(emptyProductForm);
      setEditingId("");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Falha ao salvar produto.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function submitEntry(event: FormEvent) {
    event.preventDefault();
    const quantity = parseDecimal(entryQuantity);
    if (!selected || quantity === null || quantity <= 0) {
      setError("Selecione um produto e informe uma entrada positiva.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await addStock(selected.id, Math.round(quantity * 1000), "Entrada manual");
      setEntryQuantity("");
      notify("ENTRADA REGISTRADA");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Falha na entrada.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function removeSelected() {
    if (!selected) return;
    if (!window.confirm(`Arquivar o produto ${selected.name}?`)) return;
    setBusy(true);
    setError("");
    try {
      await deleteProduct(selected.id);
      setSelectedId("");
      notify("PRODUTO ARQUIVADO");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Falha ao arquivar produto.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-5 px-4 py-5" aria-label="Controle de estoque">
      <ScreenTitle
        code="MOD-EST // 03"
        title="Estoque"
        description="Cadastre produtos e registre entradas de mercadoria."
      />

      <div className="grid grid-cols-2 gap-4">
        <DataCard title="Itens ativos" index={String(products.length).padStart(2, "0")}>
          <strong className="text-3xl font-black">{products.length}</strong>
          <p className="mt-2 font-mono text-[10px]">CADASTROS</p>
        </DataCard>
        <DataCard
          title="Abaixo mínimo"
          index={String(lowStock).padStart(2, "0")}
          className={lowStock > 0 ? "bg-[#A91D11] text-white" : ""}
        >
          <strong className="text-3xl font-black">{lowStock}</strong>
          <p className="mt-2 font-mono text-[10px]">REPÔR AGORA</p>
        </DataCard>
      </div>

      <button
        className="w-full rounded-none border-4 border-[#1A1A1A] bg-white px-4 py-4 text-sm font-black uppercase tracking-[0.12em] shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] active:translate-x-1 active:translate-y-1 active:shadow-none"
        onClick={openCreate}
      >
        + Cadastrar produto
      </button>

      {formOpen && (
        <form
          className="space-y-4 border-4 border-[#1A1A1A] bg-gray-200 p-4 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]"
          onSubmit={submitProduct}
        >
          <h3 className="border-b-2 border-[#1A1A1A] pb-2 text-sm font-black uppercase">
            {editingId ? "Editar produto" : "Novo produto"}
          </h3>
          <TextInput
            label="Nome do produto"
            value={form.name}
            onChange={(event) => setField("name", event.target.value)}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <TextInput
              label="SKU"
              value={form.sku}
              onChange={(event) => setField("sku", event.target.value)}
              required
            />
            <TextInput
              label="Código de barras"
              value={form.barcode}
              onChange={(event) => setField("barcode", event.target.value)}
            />
          </div>
          <TextInput
            label="URL pública da foto"
            type="url"
            placeholder="HTTPS://..."
            value={form.photoUrl}
            onChange={(event) => setField("photoUrl", event.target.value)}
          />
          <div className="grid grid-cols-2 gap-4">
            <TextInput
              label="Preço de venda"
              inputMode="decimal"
              placeholder="0,00"
              value={form.price}
              onChange={(event) => setField("price", event.target.value)}
              required
            />
            <TextInput
              label="Estoque mínimo"
              inputMode="decimal"
              value={form.minStock}
              onChange={(event) => setField("minStock", event.target.value)}
              required
            />
          </div>
          {!editingId && (
            <TextInput
              label="Saldo inicial"
              inputMode="decimal"
              value={form.initialStock}
              onChange={(event) => setField("initialStock", event.target.value)}
              required
            />
          )}
          <div className="grid grid-cols-2 gap-4">
            <PrimaryButton type="submit" disabled={busy}>
              {busy ? "Salvando..." : "Salvar registro"}
            </PrimaryButton>
            <button
              type="button"
              className="rounded-none border-4 border-[#1A1A1A] bg-white p-3 text-xs font-black uppercase"
              onClick={() => setFormOpen(false)}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {products.length > 0 && (
        <>
          <TextInput
            label="Filtrar inventário"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="CÓDIGO / NOME / BARRAS"
          />

          <DataCard title="Relação de materiais" index={`${visibleProducts.length}`}>
            <div className="border-y-2 border-[#1A1A1A]">
              {visibleProducts.map((product) => {
                const isSelected = product.id === selectedId;
                const isCritical = product.stockMilli <= product.minStockMilli;
                return (
                  <button
                    key={product.id}
                    className={[
                      "grid w-full grid-cols-[1fr_auto] gap-3 rounded-none border-b-2 border-[#1A1A1A] p-3 text-left last:border-b-0",
                      isSelected
                        ? "bg-[#1A1A1A] text-white"
                        : "bg-white text-[#1A1A1A]",
                    ].join(" ")}
                    onClick={() => setSelectedId(product.id)}
                  >
                    <span>
                      <strong className="block text-xs font-black uppercase">
                        {product.name}
                      </strong>
                      <small className="font-mono text-[10px]">
                        {product.sku}
                        {" // "}
                        {formatMoney(product.salePriceCents)}
                      </small>
                    </span>
                    <strong
                      className={[
                        "self-center font-mono text-xs",
                        isCritical && !isSelected ? "text-[#A91D11]" : "",
                      ].join(" ")}
                    >
                      {formatQuantity(product.stockMilli)} UN.
                    </strong>
                  </button>
                );
              })}
            </div>
          </DataCard>
        </>
      )}

      {selected && (
        <DataCard title="Produto selecionado" index={selected.sku}>
          <form className="space-y-4" onSubmit={submitEntry}>
            <p className="font-mono text-xs uppercase">
              {selected.name}
              {" // SALDO "}
              {formatQuantity(selected.stockMilli)} UN.
            </p>
            <TextInput
              label="Quantidade de entrada"
              inputMode="decimal"
              value={entryQuantity}
              onChange={(event) => setEntryQuantity(event.target.value)}
              placeholder="0"
            />
            <PrimaryButton className="w-full" type="submit" disabled={busy}>
              Registrar entrada
            </PrimaryButton>
          </form>
          <div className="mt-4 grid grid-cols-2 gap-4 border-t-2 border-[#1A1A1A] pt-4">
            <button
              className="rounded-none border-2 border-[#1A1A1A] bg-white p-3 text-xs font-black uppercase"
              onClick={() => openEdit(selected)}
            >
              Editar cadastro
            </button>
            <button
              className="rounded-none border-2 border-[#1A1A1A] bg-[#A91D11] p-3 text-xs font-black uppercase text-white"
              onClick={() => void removeSelected()}
              disabled={busy}
            >
              Arquivar
            </button>
          </div>
        </DataCard>
      )}

      {error && (
        <p className="border-4 border-[#1A1A1A] bg-[#A91D11] p-3 font-mono text-xs font-black uppercase text-white">
          ERRO // {error}
        </p>
      )}
    </section>
  );
}

const menuEntries = [
  ["01", "Clientes e fiado", "Em desenvolvimento"],
  ["02", "Fluxo de caixa", "Vendas já registradas"],
  ["03", "Fornecedores", "Em desenvolvimento"],
  ["04", "Relatórios", "Em desenvolvimento"],
  ["05", "Equipe e acessos", "Em desenvolvimento"],
  ["06", "Configurações", "Em desenvolvimento"],
];

function MenuScreen({ notify }: { notify: (message: string) => void }) {
  return (
    <section className="space-y-5 px-4 py-5" aria-label="Menu administrativo">
      <ScreenTitle
        code="DIR-ADM // 04"
        title="Menu geral"
        description="Os próximos módulos serão ativados incrementalmente."
      />
      <a
        href="/catalogo"
        target="_blank"
        rel="noreferrer"
        className="block rounded-none border-4 border-[#1A1A1A] bg-[#A91D11] px-4 py-4 text-center text-sm font-black uppercase tracking-[0.12em] text-white shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] active:translate-x-1 active:translate-y-1 active:shadow-none"
      >
        Abrir catálogo do povo ↗
      </a>
      <div className="grid grid-cols-2 gap-4">
        {menuEntries.map(([code, label, status]) => (
          <button
            key={code}
            className="min-h-36 rounded-none border-4 border-[#1A1A1A] bg-white p-4 text-left shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] active:translate-x-1 active:translate-y-1 active:shadow-none"
            onClick={() => notify(`${label}: ${status}`)}
          >
            <span className="block font-mono text-[10px] font-black text-[#A91D11]">
              SETOR // {code}
            </span>
            <strong className="mt-5 block text-sm font-black uppercase leading-4">
              {label}
            </strong>
            <span className="mt-3 block font-mono text-[9px] uppercase">{status}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

export function Dashboard() {
  const [active, setActive] = useState<NavigationId>("painel");
  const [notice, setNotice] = useState("");
  const store = useStore();

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  function navigate(destination: NavigationId, message?: string) {
    setActive(destination);
    if (message) setNotice(message);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <main className="min-h-dvh bg-[#D1D1D1] font-sans text-[#1A1A1A]">
      <div className="relative mx-auto min-h-dvh max-w-md border-x-4 border-[#1A1A1A] bg-gray-100 pb-28">
        <div className="h-3 border-b-4 border-[#1A1A1A] bg-[#A91D11]" />

        <header className="border-b-4 border-[#1A1A1A] bg-white px-4 py-5">
          <div className="mb-3 flex items-center justify-between font-mono text-[10px] font-bold uppercase tracking-[0.16em]">
            <span>Sistema operacional // 01</span>
            <span className="border-2 border-[#1A1A1A] bg-gray-100 px-2 py-1">
              {store.loading ? "Sincronizando" : store.error ? "Falha" : "Online"}
            </span>
          </div>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="mb-1 text-xs font-black uppercase tracking-[0.2em] text-[#A91D11]">
                {screenLabels[active]}
              </p>
              <h1 className="max-w-[280px] text-3xl font-black uppercase leading-[0.88] tracking-[-0.055em]">
                Estoque
                <br />
                Soviético
              </h1>
            </div>
            <div
              className="grid size-14 place-items-center border-4 border-[#1A1A1A] bg-[#A91D11] text-2xl font-black text-white"
              aria-hidden="true"
            >
              ES
            </div>
          </div>
        </header>

        {store.error && (
          <div className="mx-4 mt-4 border-4 border-[#1A1A1A] bg-yellow-300 p-3 font-mono text-xs font-black uppercase">
            FALHA DE SINCRONIZAÇÃO // {store.error}
            <button
              className="mt-3 block border-2 border-[#1A1A1A] bg-white px-3 py-2 font-black uppercase"
              onClick={() => void store.refresh()}
            >
              Tentar novamente
            </button>
          </div>
        )}

        {active === "painel" && (
          <PanelScreen
            products={store.products}
            sales={store.sales}
            todayTotalCents={store.todayTotalCents}
            navigate={navigate}
          />
        )}
        {active === "vendas" && (
          <SalesScreen
            products={store.products}
            createSale={store.createSale}
            navigate={navigate}
            notify={setNotice}
          />
        )}
        {active === "estoque" && (
          <StockScreen
            products={store.products}
            createProduct={store.createProduct}
            updateProduct={store.updateProduct}
            deleteProduct={store.deleteProduct}
            addStock={store.addStock}
            notify={setNotice}
          />
        )}
        {active === "menu" && <MenuScreen notify={setNotice} />}

        <nav
          className="fixed inset-x-0 bottom-0 z-20 mx-auto grid max-w-md grid-cols-4 border-x-4 border-t-4 border-[#1A1A1A] bg-white"
          aria-label="Navegação principal"
        >
          {navigation.map((item) => {
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                className={[
                  "min-h-20 rounded-none border-r-2 border-[#1A1A1A] px-1 py-2",
                  "font-black uppercase last:border-r-0",
                  isActive ? "bg-[#A91D11] text-white" : "bg-white text-[#1A1A1A]",
                ].join(" ")}
                onClick={() => navigate(item.id)}
                aria-current={isActive ? "page" : undefined}
              >
                <span className="block text-xl leading-none" aria-hidden="true">
                  {item.icon}
                </span>
                <span className="mt-2 block text-[9px] tracking-[0.1em]">
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        {notice && (
          <div
            role="status"
            className="fixed bottom-24 left-1/2 z-30 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-none border-4 border-[#1A1A1A] bg-yellow-300 p-3 font-mono text-xs font-black uppercase shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]"
          >
            OK // {notice}
          </div>
        )}
      </div>
    </main>
  );
}
