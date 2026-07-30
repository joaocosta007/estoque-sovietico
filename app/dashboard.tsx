"use client";

import { useEffect, useState } from "react";
import { DataCard, PrimaryButton, TextInput } from "./components/ui";

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

function PanelScreen({ navigate }: { navigate: Navigate }) {
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
            Alertas críticos
          </h2>
          <span className="border-2 border-white px-2 py-1 font-mono text-xs font-black">
            03
          </span>
        </div>
        <p className="font-mono text-sm leading-5">
          ESTOQUE ABAIXO DO MÍNIMO EM 3 ITENS. REPOSIÇÃO NECESSÁRIA.
        </p>
        <button
          className="mt-4 rounded-none border-2 border-white bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-[#A91D11] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-white"
          onClick={() => navigate("estoque", "RELATÓRIO DE REPOSIÇÃO ABERTO")}
        >
          Ver relatório →
        </button>
      </section>

      <div className="grid grid-cols-2 gap-4">
        <DataCard title="Faturamento hoje" index="KPI-01">
          <p className="font-mono text-[10px] font-bold uppercase text-gray-600">
            30 JUL // BRL
          </p>
          <strong className="mt-3 block text-[1.7rem] font-black leading-none tracking-[-0.06em]">
            R$ 4.280
          </strong>
          <p className="mt-3 border-t-2 border-[#1A1A1A] pt-2 font-mono text-[10px] font-bold">
            +12,4% / ONTEM
          </p>
        </DataCard>

        <DataCard title="Clientes fiado" index="KPI-02">
          <p className="font-mono text-[10px] font-bold uppercase text-gray-600">
            SALDO DEVEDOR
          </p>
          <strong className="mt-3 block text-[1.7rem] font-black leading-none tracking-[-0.06em] text-[#A91D11]">
            R$ 1.960
          </strong>
          <p className="mt-3 border-t-2 border-[#1A1A1A] pt-2 font-mono text-[10px] font-bold">
            08 CADASTROS
          </p>
        </DataCard>
      </div>

      <div className="grid grid-cols-[1fr_88px] gap-4">
        <PrimaryButton onClick={() => navigate("vendas", "NOVA VENDA INICIADA")}>
          + Registrar venda
        </PrimaryButton>
        <button
          aria-label="Escanear código"
          className="rounded-none border-4 border-[#1A1A1A] bg-white text-2xl font-black shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] active:translate-x-1 active:translate-y-1 active:shadow-none"
          onClick={() => navigate("vendas", "LEITOR DE CÓDIGO ACIONADO")}
        >
          [▥]
        </button>
      </div>

      <TextInput
        label="Consulta rápida de produto"
        name="product-search"
        placeholder="CÓDIGO / NOME / LOTE"
        autoComplete="off"
      />

      <DataCard title="Livro-caixa recente" index="REG-07">
        <div className="divide-y-2 divide-[#1A1A1A] border-y-2 border-[#1A1A1A] font-mono text-xs">
          <div className="grid grid-cols-[52px_1fr_auto] gap-2 py-3">
            <time>14:32</time>
            <span>Venda #1047</span>
            <strong>+84,90</strong>
          </div>
          <div className="grid grid-cols-[52px_1fr_auto] gap-2 py-3">
            <time>13:05</time>
            <span>Compra fornecedor</span>
            <strong className="text-[#A91D11]">−320,00</strong>
          </div>
          <div className="grid grid-cols-[52px_1fr_auto] gap-2 py-3">
            <time>11:48</time>
            <span>Venda #1046</span>
            <strong>+156,00</strong>
          </div>
        </div>
        <button
          className="mt-4 w-full rounded-none border-2 border-[#1A1A1A] bg-gray-100 px-3 py-3 text-xs font-black uppercase tracking-[0.12em] hover:bg-[#1A1A1A] hover:text-white"
          onClick={() => navigate("menu", "LIVRO-CAIXA SELECIONADO")}
        >
          Abrir livro completo →
        </button>
      </DataCard>
    </section>
  );
}

function SalesScreen({ notify }: { notify: (message: string) => void }) {
  const [quantity, setQuantity] = useState(1);
  const total = (29.9 * quantity).toFixed(2).replace(".", ",");

  return (
    <section className="space-y-5 px-4 py-5" aria-label="Registro de venda">
      <ScreenTitle
        code="MOD-VEN // 02"
        title="Nova venda"
        description="Selecione os itens e confirme o recebimento."
      />

      <TextInput
        label="Localizar mercadoria"
        name="sale-product-search"
        placeholder="CÓDIGO / NOME / BARRAS"
        autoFocus
      />

      <DataCard title="Item selecionado" index="ITM-01">
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <div>
            <strong className="block text-sm font-black uppercase">
              Café especial 250g
            </strong>
            <span className="mt-1 block font-mono text-xs">
              CAF-001 // R$ 29,90 UN.
            </span>
          </div>
          <span className="border-2 border-[#1A1A1A] bg-gray-100 px-2 py-1 font-mono text-xs font-black">
            SALDO 08
          </span>
        </div>

        <div className="mt-5 grid grid-cols-3 border-4 border-[#1A1A1A]">
          <button
            aria-label="Diminuir quantidade"
            className="rounded-none border-r-2 border-[#1A1A1A] bg-white py-3 text-xl font-black active:bg-gray-300"
            onClick={() => setQuantity((current) => Math.max(1, current - 1))}
          >
            −
          </button>
          <output className="grid place-items-center bg-gray-100 font-mono text-lg font-black">
            {quantity}
          </output>
          <button
            aria-label="Aumentar quantidade"
            className="rounded-none border-l-2 border-[#1A1A1A] bg-white py-3 text-xl font-black active:bg-gray-300"
            onClick={() => setQuantity((current) => current + 1)}
          >
            +
          </button>
        </div>
      </DataCard>

      <DataCard title="Fechamento" index="CX-01">
        <div className="space-y-3 font-mono text-xs">
          <div className="flex justify-between border-b-2 border-[#1A1A1A] pb-2">
            <span>SUBTOTAL</span>
            <strong>R$ {total}</strong>
          </div>
          <div className="flex justify-between border-b-2 border-[#1A1A1A] pb-2">
            <span>DESCONTO</span>
            <strong>R$ 0,00</strong>
          </div>
          <div className="flex justify-between text-base font-black">
            <span>TOTAL</span>
            <strong>R$ {total}</strong>
          </div>
        </div>
      </DataCard>

      <PrimaryButton
        className="w-full"
        onClick={() => notify(`VENDA DE R$ ${total} REGISTRADA`)}
      >
        Salvar registro
      </PrimaryButton>
    </section>
  );
}

const stockItems = [
  { code: "CAF-001", name: "Café especial 250g", amount: "08 UN.", critical: true },
  { code: "KIT-003", name: "Kit presente café", amount: "04 UN.", critical: true },
  { code: "CAN-014", name: "Caneca cerâmica", amount: "24 UN.", critical: false },
  { code: "ACO-008", name: "Açúcar sachê", amount: "120 UN.", critical: false },
];

function StockScreen({ notify }: { notify: (message: string) => void }) {
  const [query, setQuery] = useState("");
  const visibleItems = stockItems.filter((item) =>
    `${item.code} ${item.name}`.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <section className="space-y-5 px-4 py-5" aria-label="Controle de estoque">
      <ScreenTitle
        code="MOD-EST // 03"
        title="Estoque"
        description="Posição atual dos materiais e pontos de reposição."
      />

      <div className="grid grid-cols-2 gap-4">
        <DataCard title="Itens ativos" index="48">
          <strong className="text-3xl font-black">48</strong>
          <p className="mt-2 font-mono text-[10px]">CADASTROS</p>
        </DataCard>
        <DataCard title="Abaixo mínimo" index="03" className="bg-[#A91D11] text-white">
          <strong className="text-3xl font-black">03</strong>
          <p className="mt-2 font-mono text-[10px]">REPÔR AGORA</p>
        </DataCard>
      </div>

      <TextInput
        label="Filtrar inventário"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="CÓDIGO / NOME"
      />

      <DataCard title="Relação de materiais" index={`${visibleItems.length}`}>
        <div className="border-y-2 border-[#1A1A1A]">
          {visibleItems.map((item) => (
            <button
              key={item.code}
              className="grid w-full grid-cols-[1fr_auto] gap-3 rounded-none border-b-2 border-[#1A1A1A] bg-white py-3 text-left last:border-b-0 active:bg-gray-200"
              onClick={() => notify(`${item.code} SELECIONADO`)}
            >
              <span>
                <strong className="block text-xs font-black uppercase">{item.name}</strong>
                <small className="font-mono text-[10px]">{item.code}</small>
              </span>
              <strong
                className={[
                  "self-center font-mono text-xs",
                  item.critical ? "text-[#A91D11]" : "text-[#1A1A1A]",
                ].join(" ")}
              >
                {item.amount}
              </strong>
            </button>
          ))}
          {visibleItems.length === 0 && (
            <p className="py-5 text-center font-mono text-xs font-black uppercase">
              Nenhum registro encontrado
            </p>
          )}
        </div>
      </DataCard>

      <div className="grid grid-cols-2 gap-4">
        <PrimaryButton onClick={() => notify("ENTRADA DE MERCADORIA ABERTA")}>
          + Dar entrada
        </PrimaryButton>
        <button
          className="rounded-none border-4 border-[#1A1A1A] bg-white px-3 py-3 text-xs font-black uppercase tracking-[0.1em] shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] active:translate-x-1 active:translate-y-1 active:shadow-none"
          onClick={() => notify("CADASTRO DE PRODUTO ABERTO")}
        >
          Novo produto
        </button>
      </div>
    </section>
  );
}

const menuEntries = [
  ["01", "Clientes e fiado"],
  ["02", "Fluxo de caixa"],
  ["03", "Fornecedores"],
  ["04", "Relatórios"],
  ["05", "Equipe e acessos"],
  ["06", "Configurações"],
];

function MenuScreen({ notify }: { notify: (message: string) => void }) {
  return (
    <section className="space-y-5 px-4 py-5" aria-label="Menu administrativo">
      <ScreenTitle
        code="DIR-ADM // 04"
        title="Menu geral"
        description="Acesso aos registros administrativos e financeiros."
      />

      <div className="grid grid-cols-2 gap-4">
        {menuEntries.map(([code, label]) => (
          <button
            key={code}
            className="min-h-32 rounded-none border-4 border-[#1A1A1A] bg-white p-4 text-left shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] active:translate-x-1 active:translate-y-1 active:shadow-none"
            onClick={() => notify(`${label} ABERTO`)}
          >
            <span className="block font-mono text-[10px] font-black text-[#A91D11]">
              SETOR // {code}
            </span>
            <strong className="mt-5 block text-sm font-black uppercase leading-4">
              {label}
            </strong>
            <span className="mt-3 block text-xl font-black">→</span>
          </button>
        ))}
      </div>

      <DataCard title="Sessão atual" index="USR-01">
        <div className="font-mono text-xs">
          <p className="border-b-2 border-[#1A1A1A] pb-2">OPERADOR: JOÃO PIRANI</p>
          <p className="pt-2">NÍVEL: ADMINISTRADOR</p>
        </div>
      </DataCard>
    </section>
  );
}

export function Dashboard() {
  const [active, setActive] = useState<NavigationId>("painel");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 2400);
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
              Online
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

        {active === "painel" && <PanelScreen navigate={navigate} />}
        {active === "vendas" && <SalesScreen notify={setNotice} />}
        {active === "estoque" && <StockScreen notify={setNotice} />}
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

