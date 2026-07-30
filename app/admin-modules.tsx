"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { DataCard, PrimaryButton, TextInput } from "./components/ui";
import type {
  AppSettings,
  Customer,
  Expense,
  LedgerEntry,
  StaffMember,
  Supplier,
} from "./use-admin-store";
import type { Product, Sale } from "./use-store";

export type AdminSection =
  | "customers"
  | "cash"
  | "suppliers"
  | "reports"
  | "staff"
  | "settings";

type Props = {
  section: AdminSection;
  customers: Customer[];
  ledger: LedgerEntry[];
  expenses: Expense[];
  suppliers: Supplier[];
  staff: StaffMember[];
  settings: AppSettings;
  products: Product[];
  sales: Sale[];
  todayTotalCents: number;
  onBack: () => void;
  notify: (message: string) => void;
  createCustomer: (body: unknown) => Promise<void>;
  updateCustomer: (body: unknown) => Promise<void>;
  addLedgerEntry: (body: unknown) => Promise<void>;
  createExpense: (body: unknown) => Promise<void>;
  toggleExpense: (id: string, paid: boolean) => Promise<void>;
  createSupplier: (body: unknown) => Promise<void>;
  archiveSupplier: (id: string) => Promise<void>;
  createStaff: (body: unknown) => Promise<void>;
  updateStaffPermissions: (
    id: string,
    permissions: string[],
  ) => Promise<void>;
  saveSettings: (body: AppSettings) => Promise<void>;
};

const moneyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

function money(cents: number) {
  return moneyFormatter.format(cents / 100);
}

function cents(value: FormDataEntryValue | null) {
  const parsed = Number(String(value ?? "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : null;
}

function ModuleHeader({
  code,
  title,
  description,
  onBack,
}: {
  code: string;
  title: string;
  description: string;
  onBack: () => void;
}) {
  return (
    <header className="border-b-4 border-[#1A1A1A] pb-4">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 rounded-none border-2 border-[#1A1A1A] bg-white px-3 py-2 font-mono text-[10px] font-black uppercase"
      >
        ← Menu geral
      </button>
      <p className="font-mono text-[10px] font-black uppercase tracking-[0.16em] text-[#A91D11]">
        {code}
      </p>
      <h2 className="mt-1 text-2xl font-black uppercase leading-none tracking-[-0.04em]">
        {title}
      </h2>
      <p className="mt-2 font-mono text-xs uppercase leading-5 text-gray-700">
        {description}
      </p>
    </header>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <p className="border-4 border-[#1A1A1A] bg-[#A91D11] p-3 font-mono text-xs font-black uppercase text-white">
      ERRO // {message}
    </p>
  );
}

function CustomersModule(props: Props) {
  const [selectedId, setSelectedId] = useState("");
  const [formOpen, setFormOpen] = useState(props.customers.length === 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const selected = props.customers.find((customer) => customer.id === selectedId);
  const selectedLedger = props.ledger.filter(
    (entry) => entry.customerId === selectedId,
  );
  const totalDebt = props.customers.reduce(
    (total, customer) => total + customer.balanceCents,
    0,
  );

  async function createCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const creditLimitCents = cents(data.get("creditLimit"));
    if (creditLimitCents === null) {
      setError("Informe um limite de crédito válido.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await props.createCustomer({
        name: data.get("name"),
        phone: data.get("phone"),
        document: data.get("document"),
        notes: data.get("notes"),
        creditLimitCents,
      });
      form.reset();
      setFormOpen(false);
      props.notify("CLIENTE CADASTRADO");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Falha.");
    } finally {
      setBusy(false);
    }
  }

  async function addEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const amountCents = cents(data.get("amount"));
    if (amountCents === null || amountCents <= 0) {
      setError("Informe um valor positivo.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await props.addLedgerEntry({
        customerId: selected.id,
        type: data.get("type"),
        amountCents,
        description: data.get("description"),
        dueDate: data.get("dueDate"),
      });
      form.reset();
      props.notify("MOVIMENTO DO FIADO REGISTRADO");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Falha.");
    } finally {
      setBusy(false);
    }
  }

  async function updateSelected(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const data = new FormData(event.currentTarget);
    const creditLimitCents = cents(data.get("creditLimit"));
    if (creditLimitCents === null) {
      setError("Informe um limite de crédito válido.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await props.updateCustomer({
        id: selected.id,
        name: data.get("name"),
        phone: data.get("phone"),
        document: data.get("document"),
        notes: data.get("notes"),
        creditLimitCents,
      });
      props.notify("CLIENTE ATUALIZADO");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Falha.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-5 px-4 py-5">
      <ModuleHeader
        code="SETOR // 01"
        title="Clientes e fiado"
        description="Cadastro, limite, dívida, recebimento e histórico por cliente."
        onBack={props.onBack}
      />

      <div className="grid grid-cols-2 gap-4">
        <DataCard title="Saldo devedor" index="CR-01">
          <strong className="text-xl font-black text-[#A91D11]">
            {money(totalDebt)}
          </strong>
        </DataCard>
        <DataCard title="Clientes ativos" index="CR-02">
          <strong className="text-3xl font-black">{props.customers.length}</strong>
        </DataCard>
      </div>

      <PrimaryButton className="w-full" onClick={() => setFormOpen(!formOpen)}>
        {formOpen ? "Fechar cadastro" : "+ Cadastrar cliente"}
      </PrimaryButton>

      {formOpen && (
        <form
          onSubmit={createCustomer}
          className="space-y-4 border-4 border-[#1A1A1A] bg-gray-200 p-4 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]"
        >
          <TextInput label="Nome do cliente" name="name" required />
          <div className="grid grid-cols-2 gap-4">
            <TextInput label="Telefone" name="phone" inputMode="tel" />
            <TextInput label="CPF / CNPJ" name="document" />
          </div>
          <TextInput
            label="Limite de crédito"
            name="creditLimit"
            inputMode="decimal"
            placeholder="0,00"
            required
          />
          <TextInput label="Observações" name="notes" />
          <PrimaryButton type="submit" className="w-full" disabled={busy}>
            {busy ? "Salvando..." : "Salvar cliente"}
          </PrimaryButton>
        </form>
      )}

      {props.customers.length === 0 ? (
        <div className="border-4 border-dashed border-[#1A1A1A] bg-white p-6 text-center font-mono text-xs font-black uppercase">
          Nenhum cliente cadastrado.
        </div>
      ) : (
        <DataCard title="Livro de clientes" index={`${props.customers.length}`}>
          <div className="divide-y-2 divide-[#1A1A1A] border-y-2 border-[#1A1A1A]">
            {props.customers.map((customer) => (
              <button
                key={customer.id}
                onClick={() => setSelectedId(customer.id)}
                className={[
                  "grid w-full grid-cols-[1fr_auto] gap-3 rounded-none p-3 text-left",
                  customer.id === selectedId
                    ? "bg-[#1A1A1A] text-white"
                    : "bg-white",
                ].join(" ")}
              >
                <span>
                  <strong className="block text-xs font-black uppercase">
                    {customer.name}
                  </strong>
                  <small className="font-mono text-[9px]">
                    LIMITE {money(customer.creditLimitCents)}
                  </small>
                </span>
                <strong
                  className={[
                    "self-center font-mono text-xs",
                    customer.balanceCents > 0 && customer.id !== selectedId
                      ? "text-[#A91D11]"
                      : "",
                  ].join(" ")}
                >
                  {money(customer.balanceCents)}
                </strong>
              </button>
            ))}
          </div>
        </DataCard>
      )}

      {selected && (
        <>
          <DataCard title={selected.name} index="FIADO">
            <div className="grid grid-cols-2 gap-3 font-mono text-[10px] uppercase">
              <p>Deve: {money(selected.balanceCents)}</p>
              <p>
                Disponível:{" "}
                {money(
                  Math.max(0, selected.creditLimitCents - selected.balanceCents),
                )}
              </p>
              <p className="col-span-2">
                Contato: {selected.phone || "NÃO INFORMADO"}
              </p>
            </div>
            <details className="mt-4 border-t-2 border-[#1A1A1A] pt-3">
              <summary className="cursor-pointer font-mono text-[10px] font-black uppercase">
                Editar cadastro
              </summary>
              <form
                key={selected.updatedAt}
                onSubmit={updateSelected}
                className="mt-4 space-y-4"
              >
                <TextInput
                  label="Nome"
                  name="name"
                  defaultValue={selected.name}
                  required
                />
                <div className="grid grid-cols-2 gap-4">
                  <TextInput
                    label="Telefone"
                    name="phone"
                    defaultValue={selected.phone}
                  />
                  <TextInput
                    label="CPF / CNPJ"
                    name="document"
                    defaultValue={selected.document}
                  />
                </div>
                <TextInput
                  label="Limite de crédito"
                  name="creditLimit"
                  inputMode="decimal"
                  defaultValue={(selected.creditLimitCents / 100)
                    .toFixed(2)
                    .replace(".", ",")}
                  required
                />
                <TextInput
                  label="Observações"
                  name="notes"
                  defaultValue={selected.notes}
                />
                <PrimaryButton type="submit" className="w-full" disabled={busy}>
                  Atualizar cliente
                </PrimaryButton>
              </form>
            </details>
          </DataCard>

          <form
            onSubmit={addEntry}
            className="space-y-4 border-4 border-[#1A1A1A] bg-gray-200 p-4 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]"
          >
            <label className="block">
              <span className="mb-2 block text-xs font-black uppercase">
                Tipo do movimento
              </span>
              <select
                name="type"
                className="w-full rounded-none border-4 border-[#1A1A1A] bg-white p-3 font-mono text-sm"
              >
                <option value="payment">PAGAMENTO RECEBIDO</option>
                <option value="debit">NOVO DÉBITO MANUAL</option>
              </select>
            </label>
            <TextInput
              label="Valor"
              name="amount"
              inputMode="decimal"
              placeholder="0,00"
              required
            />
            <TextInput
              label="Descrição"
              name="description"
              placeholder="REFERÊNCIA DO MOVIMENTO"
            />
            <TextInput label="Vencimento" name="dueDate" type="date" />
            <PrimaryButton className="w-full" type="submit" disabled={busy}>
              Registrar movimento
            </PrimaryButton>
          </form>

          <DataCard title="Extrato do cliente" index={`${selectedLedger.length}`}>
            {selectedLedger.length === 0 ? (
              <p className="font-mono text-xs uppercase">Sem movimentos.</p>
            ) : (
              <div className="divide-y-2 divide-[#1A1A1A] border-y-2 border-[#1A1A1A]">
                {selectedLedger.map((entry) => (
                  <div
                    key={entry.id}
                    className="grid grid-cols-[1fr_auto] gap-2 py-3 font-mono text-[10px] uppercase"
                  >
                    <span>
                      <strong className="block">{entry.description}</strong>
                      {new Date(
                        entry.createdAt.replace(" ", "T") + "Z",
                      ).toLocaleDateString("pt-BR")}
                    </span>
                    <strong
                      className={
                        entry.type === "debit"
                          ? "text-[#A91D11]"
                          : "text-[#185C35]"
                      }
                    >
                      {entry.type === "debit" ? "+" : "-"}
                      {money(entry.amountCents)}
                    </strong>
                  </div>
                ))}
              </div>
            )}
          </DataCard>
        </>
      )}

      {error && <ErrorBox message={error} />}
    </section>
  );
}

function CashModule(props: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const receivedCredit = props.ledger
    .filter((entry) => entry.type === "payment")
    .reduce((total, entry) => total + entry.amountCents, 0);
  const paidExpenses = props.expenses
    .filter((expense) => expense.paidAt)
    .reduce((total, expense) => total + expense.amountCents, 0);
  const cashSales = props.sales
    .filter((sale) => sale.paymentMethod !== "credit")
    .reduce((total, sale) => total + sale.totalCents, 0);
  const balance = cashSales + receivedCredit - paidExpenses;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const amountCents = cents(data.get("amount"));
    if (amountCents === null || amountCents <= 0) {
      setError("Informe um valor válido.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await props.createExpense({
        description: data.get("description"),
        category: data.get("category"),
        amountCents,
        dueDate: data.get("dueDate"),
        paid: data.get("paid") === "on",
      });
      form.reset();
      props.notify("DESPESA REGISTRADA");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Falha.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-5 px-4 py-5">
      <ModuleHeader
        code="SETOR // 02"
        title="Fluxo de caixa"
        description="Entradas confirmadas, recebimentos do fiado e despesas."
        onBack={props.onBack}
      />
      <div className="grid grid-cols-2 gap-4">
        <DataCard title="Entradas" index="CX-01">
          <strong className="text-xl font-black text-[#185C35]">
            {money(cashSales + receivedCredit)}
          </strong>
        </DataCard>
        <DataCard title="Saldo caixa" index="CX-02">
          <strong
            className={[
              "text-xl font-black",
              balance < 0 ? "text-[#A91D11]" : "",
            ].join(" ")}
          >
            {money(balance)}
          </strong>
        </DataCard>
      </div>
      <form
        onSubmit={submit}
        className="space-y-4 border-4 border-[#1A1A1A] bg-gray-200 p-4 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]"
      >
        <h3 className="text-sm font-black uppercase">Registrar despesa</h3>
        <TextInput label="Descrição" name="description" required />
        <div className="grid grid-cols-2 gap-4">
          <TextInput label="Categoria" name="category" />
          <TextInput
            label="Valor"
            name="amount"
            inputMode="decimal"
            required
          />
        </div>
        <TextInput label="Vencimento" name="dueDate" type="date" />
        <label className="flex items-center gap-3 border-2 border-[#1A1A1A] bg-white p-3 font-mono text-xs font-black uppercase">
          <input name="paid" type="checkbox" className="size-5 rounded-none" />
          Já foi paga
        </label>
        <PrimaryButton className="w-full" type="submit" disabled={busy}>
          Salvar despesa
        </PrimaryButton>
      </form>
      <DataCard title="Contas e despesas" index={`${props.expenses.length}`}>
        {props.expenses.length === 0 ? (
          <p className="font-mono text-xs uppercase">Nenhuma despesa registrada.</p>
        ) : (
          <div className="divide-y-2 divide-[#1A1A1A] border-y-2 border-[#1A1A1A]">
            {props.expenses.map((expense) => (
              <div
                key={expense.id}
                className="grid grid-cols-[1fr_auto] gap-3 py-3 font-mono text-[10px] uppercase"
              >
                <span>
                  <strong className="block">{expense.description}</strong>
                  {expense.category}
                  {" // "}
                  {expense.paidAt ? "PAGA" : "PENDENTE"}
                </span>
                <button
                  onClick={() =>
                    void props.toggleExpense(expense.id, !expense.paidAt)
                  }
                  className={[
                    "rounded-none border-2 border-[#1A1A1A] px-2 py-1 font-black",
                    expense.paidAt
                      ? "bg-[#185C35] text-white"
                      : "bg-yellow-300",
                  ].join(" ")}
                >
                  {money(expense.amountCents)}
                </button>
              </div>
            ))}
          </div>
        )}
      </DataCard>
      {error && <ErrorBox message={error} />}
    </section>
  );
}

function SuppliersModule(props: Props) {
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      await props.createSupplier(Object.fromEntries(data));
      form.reset();
      props.notify("FORNECEDOR CADASTRADO");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Falha.");
    }
  }
  return (
    <section className="space-y-5 px-4 py-5">
      <ModuleHeader
        code="SETOR // 03"
        title="Fornecedores"
        description="Contatos operacionais e observações de reposição."
        onBack={props.onBack}
      />
      <form
        onSubmit={submit}
        className="space-y-4 border-4 border-[#1A1A1A] bg-gray-200 p-4 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]"
      >
        <TextInput label="Razão / Nome" name="name" required />
        <TextInput label="Pessoa de contato" name="contact" />
        <TextInput label="Telefone" name="phone" inputMode="tel" />
        <TextInput label="Observações" name="notes" />
        <PrimaryButton className="w-full" type="submit">
          Salvar fornecedor
        </PrimaryButton>
      </form>
      <DataCard title="Relação de fornecedores" index={`${props.suppliers.length}`}>
        {props.suppliers.length === 0 ? (
          <p className="font-mono text-xs uppercase">Nenhum fornecedor.</p>
        ) : (
          <div className="divide-y-2 divide-[#1A1A1A] border-y-2 border-[#1A1A1A]">
            {props.suppliers.map((supplier) => (
              <div key={supplier.id} className="grid grid-cols-[1fr_auto] gap-3 py-3">
                <span>
                  <strong className="block text-xs font-black uppercase">
                    {supplier.name}
                  </strong>
                  <small className="font-mono text-[10px]">
                    {supplier.contact || "SEM CONTATO"}
                    {" // "}
                    {supplier.phone || "SEM TELEFONE"}
                  </small>
                </span>
                <button
                  onClick={() => void props.archiveSupplier(supplier.id)}
                  className="rounded-none border-2 border-[#1A1A1A] bg-white px-2 font-mono text-[9px] font-black uppercase"
                >
                  Arquivar
                </button>
              </div>
            ))}
          </div>
        )}
      </DataCard>
      {error && <ErrorBox message={error} />}
    </section>
  );
}

function ReportsModule(props: Props) {
  const totalSales = props.sales.reduce((sum, sale) => sum + sale.totalCents, 0);
  const totalDebt = props.customers.reduce(
    (sum, customer) => sum + customer.balanceCents,
    0,
  );
  const stockValue = props.products.reduce(
    (sum, product) =>
      sum + Math.round((product.salePriceCents * product.stockMilli) / 1000),
    0,
  );

  function exportCsv() {
    const rows = [
      ["METRICA", "VALOR_CENTAVOS"],
      ["VENDAS", String(totalSales)],
      ["FIADO_A_RECEBER", String(totalDebt)],
      ["ESTOQUE_PRECO_VENDA", String(stockValue)],
      ["DESPESAS_PAGAS", String(
        props.expenses
          .filter((expense) => expense.paidAt)
          .reduce((sum, expense) => sum + expense.amountCents, 0),
      )],
    ];
    const blob = new Blob(
      [rows.map((row) => row.join(";")).join("\n")],
      { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `relatorio-estoque-sovietico-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    props.notify("RELATÓRIO CSV GERADO");
  }

  return (
    <section className="space-y-5 px-4 py-5">
      <ModuleHeader
        code="SETOR // 04"
        title="Relatórios"
        description="Indicadores consolidados e exportação para análise externa."
        onBack={props.onBack}
      />
      <div className="grid grid-cols-2 gap-4">
        <DataCard title="Vendas" index="RP-01">
          <strong className="text-xl font-black">{money(totalSales)}</strong>
        </DataCard>
        <DataCard title="A receber" index="RP-02">
          <strong className="text-xl font-black text-[#A91D11]">
            {money(totalDebt)}
          </strong>
        </DataCard>
        <DataCard title="Estoque venda" index="RP-03">
          <strong className="text-xl font-black">{money(stockValue)}</strong>
        </DataCard>
        <DataCard title="Itens críticos" index="RP-04">
          <strong className="text-3xl font-black">
            {
              props.products.filter(
                (product) => product.stockMilli <= product.minStockMilli,
              ).length
            }
          </strong>
        </DataCard>
      </div>
      <PrimaryButton className="w-full" onClick={exportCsv}>
        Exportar resumo CSV
      </PrimaryButton>
      <DataCard title="Critério de cálculo" index="NOTA">
        <p className="font-mono text-[10px] uppercase leading-5">
          O valor do estoque usa o preço de venda atual. O saldo a receber usa
          todos os débitos menos pagamentos lançados no livro de fiado.
        </p>
      </DataCard>
    </section>
  );
}

const permissions = [
  ["sales.view", "Ver vendas"],
  ["sales.create", "Registrar vendas"],
  ["stock.edit", "Alterar estoque"],
  ["customers.credit", "Operar fiado"],
  ["reports.view", "Ver relatórios"],
] as const;

function StaffModule(props: Props) {
  const [selected, setSelected] = useState<StaffMember | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const chosen = permissions
      .map(([code]) => code)
      .filter((code) => data.get(code) === "on");
    try {
      await props.createStaff({
        name: data.get("name"),
        role: data.get("role"),
        permissions: chosen,
      });
      form.reset();
      props.notify("FUNCIONÁRIO CADASTRADO");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Falha.");
    }
  }

  function choose(member: StaffMember) {
    setSelected(member);
    setSelectedPermissions(member.permissions);
  }

  return (
    <section className="space-y-5 px-4 py-5">
      <ModuleHeader
        code="SETOR // 05"
        title="Equipe e acessos"
        description="Perfis internos e permissões granulares por funcionário."
        onBack={props.onBack}
      />
      <form
        onSubmit={submit}
        className="space-y-4 border-4 border-[#1A1A1A] bg-gray-200 p-4 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]"
      >
        <TextInput label="Nome do funcionário" name="name" required />
        <TextInput label="Função" name="role" required />
        <fieldset className="space-y-2 border-2 border-[#1A1A1A] bg-white p-3">
          <legend className="px-2 text-xs font-black uppercase">Permissões</legend>
          {permissions.map(([code, label]) => (
            <label
              key={code}
              className="flex items-center gap-3 font-mono text-[10px] font-black uppercase"
            >
              <input name={code} type="checkbox" className="size-5 rounded-none" />
              {label}
            </label>
          ))}
        </fieldset>
        <PrimaryButton className="w-full" type="submit">
          Salvar acesso
        </PrimaryButton>
      </form>
      <DataCard title="Equipe cadastrada" index={`${props.staff.length}`}>
        {props.staff.map((member) => (
          <button
            key={member.id}
            onClick={() => choose(member)}
            className="block w-full rounded-none border-b-2 border-[#1A1A1A] bg-white p-3 text-left last:border-b-0"
          >
            <strong className="block text-xs font-black uppercase">
              {member.name}
            </strong>
            <small className="font-mono text-[9px] uppercase">
              {member.role}
              {" // "}
              {member.permissions.length} permissões
            </small>
          </button>
        ))}
      </DataCard>
      {selected && (
        <DataCard title={`Permissões // ${selected.name}`} index="RBAC">
          <div className="space-y-3">
            {permissions.map(([code, label]) => (
              <label
                key={code}
                className="flex items-center gap-3 font-mono text-[10px] font-black uppercase"
              >
                <input
                  type="checkbox"
                  checked={selectedPermissions.includes(code)}
                  onChange={(event) =>
                    setSelectedPermissions((current) =>
                      event.target.checked
                        ? [...current, code]
                        : current.filter((item) => item !== code),
                    )
                  }
                  className="size-5 rounded-none"
                />
                {label}
              </label>
            ))}
            <PrimaryButton
              className="w-full"
              onClick={() =>
                void props
                  .updateStaffPermissions(selected.id, selectedPermissions)
                  .then(() => props.notify("PERMISSÕES ATUALIZADAS"))
              }
            >
              Atualizar permissões
            </PrimaryButton>
          </div>
        </DataCard>
      )}
      {error && <ErrorBox message={error} />}
    </section>
  );
}

function SettingsModule(props: Props) {
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      await props.saveSettings({
        business_name: String(data.get("business_name") ?? ""),
        whatsapp_number: String(data.get("whatsapp_number") ?? ""),
      });
      props.notify("CONFIGURAÇÕES SALVAS");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Falha.");
    }
  }
  return (
    <section className="space-y-5 px-4 py-5">
      <ModuleHeader
        code="SETOR // 06"
        title="Configurações"
        description="Identidade comercial e canal de atendimento."
        onBack={props.onBack}
      />
      <form
        key={`${props.settings.business_name}-${props.settings.whatsapp_number}`}
        onSubmit={submit}
        className="space-y-4 border-4 border-[#1A1A1A] bg-gray-200 p-4 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]"
      >
        <TextInput
          label="Nome do comércio"
          name="business_name"
          defaultValue={props.settings.business_name ?? "Estoque Soviético"}
        />
        <TextInput
          label="WhatsApp comercial"
          name="whatsapp_number"
          inputMode="tel"
          placeholder="5511999999999"
          defaultValue={props.settings.whatsapp_number ?? ""}
        />
        <PrimaryButton className="w-full" type="submit">
          Salvar configurações
        </PrimaryButton>
      </form>
      <DataCard title="Formato do WhatsApp" index="INFO">
        <p className="font-mono text-[10px] uppercase leading-5">
          Informe código do país, DDD e número, somente com algarismos. Exemplo:
          5511999999999.
        </p>
      </DataCard>
      {error && <ErrorBox message={error} />}
    </section>
  );
}

export function AdminModule(props: Props) {
  if (props.section === "customers") return <CustomersModule {...props} />;
  if (props.section === "cash") return <CashModule {...props} />;
  if (props.section === "suppliers") return <SuppliersModule {...props} />;
  if (props.section === "reports") return <ReportsModule {...props} />;
  if (props.section === "staff") return <StaffModule {...props} />;
  return <SettingsModule {...props} />;
}
