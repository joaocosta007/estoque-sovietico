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
                Controle central
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
              onClick={() => {
                setActive("estoque");
                setNotice("RELATÓRIO DE REPOSIÇÃO ABERTO");
              }}
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
            <PrimaryButton onClick={() => setNotice("NOVA VENDA INICIADA")}>
              + Registrar venda
            </PrimaryButton>
            <button
              aria-label="Escanear código"
              className="rounded-none border-4 border-[#1A1A1A] bg-white text-2xl font-black shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] active:translate-x-1 active:translate-y-1 active:shadow-none"
              onClick={() => setNotice("LEITOR DE CÓDIGO ACIONADO")}
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
            <button className="mt-4 w-full rounded-none border-2 border-[#1A1A1A] bg-gray-100 px-3 py-3 text-xs font-black uppercase tracking-[0.12em] hover:bg-[#1A1A1A] hover:text-white">
              Abrir livro completo →
            </button>
          </DataCard>
        </section>

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
                onClick={() => setActive(item.id)}
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

