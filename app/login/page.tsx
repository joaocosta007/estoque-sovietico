import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Acesso Administrativo | Estoque Soviético",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;

  return (
    <main className="min-h-dvh bg-[#D1D1D1] px-4 py-8 font-sans text-[#1A1A1A]">
      <section className="mx-auto max-w-md rounded-none border-4 border-[#1A1A1A] bg-gray-100 shadow-[8px_8px_0px_0px_rgba(26,26,26,1)]">
        <div className="h-4 border-b-4 border-[#1A1A1A] bg-[#A91D11]" />
        <header className="border-b-4 border-[#1A1A1A] bg-white p-6">
          <p className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-[#A91D11]">
            Autorização // Setor restrito
          </p>
          <h1 className="mt-3 text-4xl font-black uppercase leading-[0.85] tracking-[-0.06em]">
            Estoque
            <br />
            Soviético
          </h1>
          <p className="mt-5 border-l-4 border-[#A91D11] pl-3 font-mono text-xs font-black uppercase leading-5">
            Identificação obrigatória para acesso administrativo
          </p>
        </header>

        <form
          action="/api/auth/login"
          method="post"
          className="space-y-5 p-6"
        >
          <label className="block">
            <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em]">
              E-mail administrativo
            </span>
            <input
              name="email"
              type="email"
              autoComplete="username"
              required
              className="w-full rounded-none border-4 border-[#1A1A1A] bg-white px-4 py-4 font-mono text-sm shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] outline-none focus:bg-yellow-100"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em]">
              Senha
            </span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              minLength={10}
              required
              className="w-full rounded-none border-4 border-[#1A1A1A] bg-white px-4 py-4 font-mono text-sm shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] outline-none focus:bg-yellow-100"
            />
          </label>

          {erro && (
            <p className="rounded-none border-4 border-[#1A1A1A] bg-[#A91D11] p-3 font-mono text-xs font-black uppercase text-white">
              {erro === "config"
                ? "Variáveis de autenticação ainda não configuradas."
                : "E-mail ou senha inválidos."}
            </p>
          )}

          <button
            type="submit"
            className="w-full rounded-none border-4 border-[#1A1A1A] bg-[#A91D11] px-5 py-4 text-sm font-black uppercase tracking-[0.12em] text-white shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] active:translate-x-1 active:translate-y-1 active:shadow-none"
          >
            Autorizar acesso
          </button>
        </form>

        <a
          href="/catalogo"
          className="block border-t-4 border-[#1A1A1A] bg-white p-4 text-center font-mono text-[10px] font-black uppercase"
        >
          Ir para o catálogo público →
        </a>
      </section>
    </main>
  );
}
