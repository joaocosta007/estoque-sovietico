import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Abastecimento dos Camaradas | Estoque Soviético",
  description:
    "Bebidas, snacks, higiene e itens essenciais para moradores do residencial universitário masculino.",
};

const categories = [
  {
    number: "01",
    title: "Bebidas geladas",
    text: "Para o estudo, para o jogo ou para aquela conversa que atravessou a madrugada.",
  },
  {
    number: "02",
    title: "Snacks e doces",
    text: "O reforço tático entre uma aula, um trabalho e a próxima missão.",
  },
  {
    number: "03",
    title: "Higiene pessoal",
    text: "O básico que ninguém lembra de comprar até o momento em que acaba.",
  },
  {
    number: "04",
    title: "Limpeza do quarto",
    text: "Suprimentos para manter o território minimamente civilizado.",
  },
  {
    number: "05",
    title: "Emergências",
    text: "Itens úteis para resolver o imprevisto sem peregrinação até o mercado.",
  },
  {
    number: "06",
    title: "Novidades",
    text: "O estoque muda. Consulte o catálogo para descobrir o que chegou ao bloco.",
  },
];

const advantages = [
  ["01", "Dentro do residencial", "Menos deslocamento, mais tempo para o que importa."],
  ["02", "Estoque transparente", "Você confere a disponibilidade antes de pedir."],
  ["03", "Pedido direto", "Escolha o item e solicite pelo WhatsApp."],
  ["04", "Feito por morador", "Uma operação pensada para a rotina de quem vive aqui."],
];

function RedStamp({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex border-2 border-red-500 bg-red-600 px-3 py-1 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-white">
      {children}
    </span>
  );
}

function CatalogButton({
  className = "",
  label = "Abrir catálogo dos camaradas",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <Link
      href="/catalogo"
      className={`group inline-flex min-h-14 items-center justify-between gap-6 border-2 border-white bg-red-600 px-5 py-4 text-sm font-black uppercase tracking-[0.12em] text-white shadow-[6px_6px_0_0_#ffffff] transition-transform hover:-translate-y-1 focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-white active:translate-x-1 active:translate-y-1 active:shadow-none ${className}`}
    >
      <span>{label}</span>
      <span aria-hidden="true" className="text-xl transition-transform group-hover:translate-x-1">
        →
      </span>
    </Link>
  );
}

export default function CamaradasLandingPage() {
  return (
    <main className="min-h-dvh overflow-hidden bg-[#090909] font-sans text-white">
      <div className="border-b border-red-500 bg-red-600 px-4 py-2 text-center font-mono text-[10px] font-black uppercase tracking-[0.18em] text-white">
        Operação de abastecimento interno // Residencial universitário masculino
      </div>

      <header className="relative z-30 border-b-2 border-white/25 bg-[#0b0b0b]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-8">
          <Link
            href="/camaradas"
            className="font-black uppercase leading-none tracking-[-0.05em]"
            aria-label="Início do Estoque Soviético"
          >
            <span className="block text-[10px] tracking-[0.28em] text-red-500">
              Diretório de suprimentos
            </span>
            <span className="text-xl sm:text-2xl">Estoque Soviético</span>
          </Link>
          <Link
            href="/catalogo"
            className="border-2 border-red-600 px-3 py-2 font-mono text-[10px] font-black uppercase tracking-[0.16em] text-white transition-colors hover:bg-red-600"
          >
            Ver estoque ↗
          </Link>
        </div>
      </header>

      <section className="relative isolate min-h-[790px] border-b-2 border-red-600 lg:min-h-[760px]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_74%_42%,rgba(225,29,22,0.48),transparent_29%),radial-gradient(circle_at_14%_8%,rgba(124,0,0,0.52),transparent_26%),linear-gradient(125deg,#070707_0%,#150303_55%,#050505_100%)]" />
        <div className="absolute -left-24 top-24 h-64 w-64 rotate-45 border-[42px] border-red-600/20" />
        <div className="absolute right-[4%] top-20 hidden h-80 w-28 rotate-[24deg] bg-red-600/20 lg:block" />
        <div className="absolute bottom-[-180px] left-[40%] h-96 w-96 border-[70px] border-red-700/10" />

        <div className="relative mx-auto grid min-h-[790px] max-w-7xl lg:min-h-[760px] lg:grid-cols-[1.02fr_0.98fr]">
          <div className="relative z-20 flex flex-col justify-center px-4 pb-16 pt-14 sm:px-8 lg:py-20">
            <div>
              <RedStamp>Abastecimento de proximidade</RedStamp>
            </div>
            <h1 className="mt-7 max-w-3xl text-[clamp(3.4rem,12vw,7.6rem)] font-black uppercase leading-[0.79] tracking-[-0.075em]">
              O residencial
              <span className="block text-red-600">tem sede.</span>
              A gente tem
              <span className="block text-red-600">estoque.</span>
            </h1>
            <p className="mt-7 max-w-xl border-l-4 border-red-600 pl-4 font-mono text-sm font-bold uppercase leading-6 text-white/78 sm:text-base">
              Bebidas, snacks, higiene e itens essenciais sem precisar abandonar
              o território.
            </p>
            <div className="mt-9">
              <CatalogButton />
            </div>
            <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.14em] text-white/45">
              Consulte produtos e disponibilidade em tempo real
            </p>
          </div>

          <div className="relative min-h-[470px] lg:min-h-full">
            <div className="absolute inset-x-4 bottom-0 top-4 border-2 border-white/20 bg-red-950 sm:inset-x-8 lg:inset-x-0 lg:left-10 lg:right-8 lg:top-14">
              <Image
                src="/landing/camarada-residencial.jpg"
                alt="Morador do residencial em uma estrutura industrial"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover object-[50%_22%] contrast-110 saturate-75"
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,0,0,0.04)_25%,rgba(10,0,0,0.94)_100%)]" />
              <div className="absolute inset-0 mix-blend-color bg-red-600/20" />
              <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between border-t-2 border-white pt-4">
                <div>
                  <p className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-red-400">
                    Operador local
                  </p>
                  <p className="mt-1 text-2xl font-black uppercase">Um de nós</p>
                </div>
                <span className="border-2 border-white bg-red-600 px-3 py-2 font-mono text-sm font-black">
                  ES
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b-2 border-red-950 bg-red-600">
        <div className="mx-auto grid max-w-7xl sm:grid-cols-2 xl:grid-cols-4">
          {advantages.map(([number, title, text]) => (
            <article
              key={number}
              className="border-b border-white/30 px-5 py-7 last:border-b-0 sm:border-r sm:odd:border-r sm:[&:nth-last-child(-n+2)]:border-b-0 xl:border-b-0"
            >
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs font-black text-black/55">{number}</span>
                <h2 className="text-sm font-black uppercase tracking-[0.08em]">{title}</h2>
              </div>
              <p className="mt-3 font-mono text-[11px] font-bold uppercase leading-5 text-white/75">
                {text}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="relative border-b-2 border-red-700 bg-[#0b0b0b] px-4 py-20 sm:px-8 lg:py-28">
        <div className="absolute right-[-100px] top-12 h-64 w-64 rotate-45 border-[36px] border-red-900/20" />
        <div className="relative mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="relative min-h-[520px] border-2 border-red-600 bg-red-950 shadow-[12px_12px_0_0_#a91d11]">
            <Image
              src="/landing/camarada-formal.jpg"
              alt="Morador atento durante atividade no residencial"
              fill
              sizes="(max-width: 1024px) 100vw, 45vw"
              className="object-cover object-center grayscale contrast-125"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_38%,rgba(20,0,0,0.92)_100%)]" />
            <div className="absolute bottom-6 left-6 right-6">
              <p className="font-mono text-xs font-black uppercase tracking-[0.18em] text-red-400">
                Missão // 01
              </p>
              <p className="mt-2 text-3xl font-black uppercase leading-none">
                Resolver o básico.
                <span className="block text-red-500">Sem burocracia.</span>
              </p>
            </div>
          </div>

          <div>
            <RedStamp>Nascido dentro do residencial</RedStamp>
            <h2 className="mt-7 max-w-3xl text-5xl font-black uppercase leading-[0.86] tracking-[-0.055em] sm:text-7xl">
              Feito por quem conhece a rotina.
            </h2>
            <p className="mt-7 max-w-2xl font-mono text-sm leading-7 text-white/68">
              Todo morador conhece a cena: o mercado está longe, a entrega ficou
              cara e justamente o que você precisava acabou. O Estoque Soviético
              nasceu para encurtar essa distância. Um ponto de abastecimento
              local, organizado e direto, para o cotidiano do residencial
              universitário masculino.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                "Consulta rápida pelo celular",
                "Produtos com saldo disponível",
                "Contato direto para solicitar",
                "Operação feita no residencial",
              ].map((item) => (
                <div
                  key={item}
                  className="flex min-h-16 items-center gap-3 border border-white/25 bg-white/[0.035] px-4 py-3 font-mono text-xs font-black uppercase"
                >
                  <span className="text-lg text-red-500">✓</span>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative bg-[#111111] px-4 py-20 sm:px-8 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-6 border-b-2 border-red-600 pb-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <RedStamp>O que pode estar no estoque</RedStamp>
              <h2 className="mt-6 text-5xl font-black uppercase leading-[0.87] tracking-[-0.055em] sm:text-7xl">
                Suprimentos para
                <span className="block text-red-600">a vida real.</span>
              </h2>
            </div>
            <p className="max-w-md font-mono text-xs font-bold uppercase leading-6 text-white/55 lg:text-right">
              A disponibilidade muda conforme as entradas e saídas. O catálogo
              mostra a situação atual.
            </p>
          </div>

          <div className="mt-8 grid md:grid-cols-2 xl:grid-cols-3">
            {categories.map((category, index) => (
              <article
                key={category.number}
                className={`group relative min-h-64 border border-white/20 bg-[#181818] p-6 transition-colors hover:bg-red-950/50 ${
                  index % 2 === 0 ? "md:border-r-0 xl:border-r" : ""
                } ${index % 3 !== 2 ? "xl:border-r-0" : ""}`}
              >
                <div className="flex items-start justify-between">
                  <span className="border border-red-600 px-2 py-1 font-mono text-[10px] font-black text-red-500">
                    LOTE // {category.number}
                  </span>
                  <span className="text-3xl text-red-700 transition-transform group-hover:translate-x-1">
                    ↗
                  </span>
                </div>
                <h3 className="mt-12 text-3xl font-black uppercase leading-none tracking-[-0.04em]">
                  {category.title}
                </h3>
                <p className="mt-4 border-t border-white/20 pt-4 font-mono text-xs leading-5 text-white/55">
                  {category.text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative border-y-2 border-red-600 bg-red-700">
        <div className="mx-auto grid max-w-7xl lg:grid-cols-2">
          <div className="relative min-h-[410px] border-b-2 border-black lg:min-h-[600px] lg:border-b-0 lg:border-r-2">
            <Image
              src="/landing/camarada-kart.jpg"
              alt="Morador conduzindo kart, representando agilidade"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover object-center grayscale contrast-125"
            />
            <div className="absolute inset-0 bg-red-700/30 mix-blend-color" />
            <div className="absolute left-5 top-5 border-2 border-white bg-black px-4 py-2 font-mono text-xs font-black uppercase tracking-[0.14em]">
              Velocidade operacional
            </div>
          </div>
          <div className="relative flex flex-col justify-center overflow-hidden px-5 py-16 sm:px-10 lg:px-14">
            <div className="absolute -right-28 top-0 h-72 w-72 rotate-45 border-[45px] border-black/12" />
            <p className="relative font-mono text-xs font-black uppercase tracking-[0.2em] text-black/65">
              Protocolo // sem enrolação
            </p>
            <h2 className="relative mt-6 text-5xl font-black uppercase leading-[0.84] tracking-[-0.06em] sm:text-7xl">
              Viu.
              <span className="block">Escolheu.</span>
              <span className="block text-black">Solicitou.</span>
            </h2>
            <ol className="relative mt-9 space-y-3 border-t-2 border-black pt-6 font-mono text-xs font-black uppercase">
              <li className="flex gap-4">
                <span className="text-black/55">01</span> Abra o catálogo
              </li>
              <li className="flex gap-4">
                <span className="text-black/55">02</span> Confira o que está disponível
              </li>
              <li className="flex gap-4">
                <span className="text-black/55">03</span> Solicite o item pelo WhatsApp
              </li>
            </ol>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#080808] px-4 py-24 text-center sm:px-8 lg:py-32">
        <div className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rotate-45 border-[70px] border-red-900/15" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(169,29,17,0.28),transparent_42%)]" />
        <div className="relative mx-auto max-w-5xl">
          <RedStamp>O estoque está a poucos toques</RedStamp>
          <h2 className="mt-7 text-[clamp(3.4rem,11vw,8.5rem)] font-black uppercase leading-[0.79] tracking-[-0.075em]">
            Não fique
            <span className="block text-red-600">na vontade.</span>
          </h2>
          <p className="mx-auto mt-8 max-w-xl font-mono text-sm font-bold uppercase leading-6 text-white/60">
            Entre no Catálogo dos Camaradas, veja o que está disponível agora e
            faça sua solicitação.
          </p>
          <div className="mt-10">
            <CatalogButton
              label="Entrar no catálogo dos camaradas"
              className="w-full max-w-lg"
            />
          </div>
        </div>
      </section>

      <footer className="border-t-2 border-white/20 bg-black px-4 py-8 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <p>Estoque Soviético // Abastecimento entre camaradas</p>
          <div className="flex gap-5">
            <Link href="/catalogo" className="text-white hover:text-red-500">
              Catálogo
            </Link>
            <Link href="/login" className="hover:text-white">
              Acesso administrativo
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
