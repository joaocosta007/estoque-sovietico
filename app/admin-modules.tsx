"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { DataCard, PrimaryButton, TextInput } from "./components/ui";
import type {
  AppSettings,
  Customer,
  Expense,
  LedgerEntry,
  NotificationCampaign,
  NotificationTemplate,
  PushRecipient,
  StaffMember,
  Supplier,
} from "./use-admin-store";
import type { Product, Sale } from "./use-store";

export type AdminSection =
  | "sales"
  | "customers"
  | "cash"
  | "suppliers"
  | "reports"
  | "staff"
  | "notifications"
  | "settings";

type Props = {
  section: AdminSection;
  customers: Customer[];
  ledger: LedgerEntry[];
  expenses: Expense[];
  suppliers: Supplier[];
  staff: StaffMember[];
  settings: AppSettings;
  notificationTemplates: NotificationTemplate[];
  pushRecipients: PushRecipient[];
  notificationCampaigns: NotificationCampaign[];
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
  cancelSale: (id: string, reason: string) => Promise<void>;
  createNotification: (body: unknown) => Promise<void>;
  updateNotification: (id: string, action: "cancel" | "sendNow") => Promise<void>;
  createNotificationTemplate: (body: unknown) => Promise<void>;
  deleteNotificationTemplate: (id: string) => Promise<void>;
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

const paymentLabels: Record<string, string> = {
  pix: "PIX",
  cash: "DINHEIRO",
  card: "CARTÃO",
  credit: "FIADO",
};

function SalesCancellationModule(props: Props) {
  const [selectedId, setSelectedId] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const selected = props.sales.find((sale) => sale.id === selectedId);
  const customer = props.customers.find(
    (entry) => entry.id === selected?.customerId,
  );

  async function cancelSelected() {
    if (!selected || reason.trim().length < 3) {
      setError("Selecione uma venda e informe o motivo do cancelamento.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await props.cancelSale(selected.id, reason);
      props.notify(`VENDA ${selected.id.slice(0, 8)} CANCELADA`);
      setSelectedId("");
      setReason("");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Falha ao cancelar a venda.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-5 px-4 py-5">
      <ModuleHeader
        code="SETOR // 07"
        title="Cancelar venda"
        description="Estorne uma operação incorreta e devolva os itens ao estoque."
        onBack={props.onBack}
      />

      <div className="border-4 border-[#1A1A1A] bg-yellow-300 p-4 font-mono text-[10px] font-black uppercase leading-5">
        O cancelamento restaura o estoque e retira a venda do faturamento. Vendas
        fiadas também recebem um lançamento de estorno no extrato do cliente.
      </div>

      <DataCard title="Histórico de vendas" index={`${props.sales.length}`}>
        {props.sales.length === 0 ? (
          <p className="font-mono text-xs uppercase">Nenhuma venda registrada.</p>
        ) : (
          <div className="max-h-[430px] overflow-y-auto border-y-2 border-[#1A1A1A]">
            {props.sales.map((sale) => {
              const isCancelled = sale.status === "cancelled";
              const isSelected = sale.id === selectedId;
              return (
                <button
                  type="button"
                  key={sale.id}
                  disabled={isCancelled}
                  onClick={() => {
                    setSelectedId(sale.id);
                    setError("");
                  }}
                  className={[
                    "grid w-full grid-cols-[1fr_auto] gap-3 rounded-none border-b-2 border-[#1A1A1A] p-3 text-left last:border-b-0",
                    isCancelled
                      ? "cursor-not-allowed bg-gray-300 text-gray-600 line-through"
                      : isSelected
                        ? "bg-[#A91D11] text-white"
                        : "bg-white",
                  ].join(" ")}
                >
                  <span>
                    <strong className="block text-xs font-black uppercase">
                      #{sale.id.slice(0, 8)}
                      {" // "}
                      {paymentLabels[sale.paymentMethod] ?? sale.paymentMethod}
                    </strong>
                    <small className="font-mono text-[9px] uppercase">
                      {new Date(
                        sale.createdAt.replace(" ", "T") + "Z",
                      ).toLocaleString("pt-BR")}
                      {isCancelled ? " // CANCELADA" : ""}
                    </small>
                  </span>
                  <strong className="self-center font-mono text-xs">
                    {money(sale.totalCents)}
                  </strong>
                </button>
              );
            })}
          </div>
        )}
      </DataCard>

      {selected && (
        <DataCard title="Confirmar estorno" index="ATENÇÃO">
          <dl className="mb-4 grid grid-cols-[1fr_auto] gap-2 border-b-2 border-[#1A1A1A] pb-4 font-mono text-[10px] uppercase">
            <dt>Venda</dt>
            <dd className="font-black">#{selected.id.slice(0, 8)}</dd>
            <dt>Pagamento</dt>
            <dd className="font-black">
              {paymentLabels[selected.paymentMethod] ?? selected.paymentMethod}
            </dd>
            {customer && (
              <>
                <dt>Cliente</dt>
                <dd className="font-black">{customer.name}</dd>
              </>
            )}
            <dt>Total</dt>
            <dd className="font-black text-[#A91D11]">
              {money(selected.totalCents)}
            </dd>
          </dl>
          <TextInput
            label="Motivo do cancelamento"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="EX.: PRODUTO OU FORMA DE PAGAMENTO INCORRETA"
            maxLength={160}
          />
          <PrimaryButton
            className="mt-5 w-full"
            type="button"
            disabled={busy || reason.trim().length < 3}
            onClick={() => void cancelSelected()}
          >
            {busy ? "Cancelando..." : "Confirmar cancelamento"}
          </PrimaryButton>
        </DataCard>
      )}

      {error && <ErrorBox message={error} />}
    </section>
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
  const cancelledSaleIds = new Set(
    props.sales
      .filter((sale) => sale.status === "cancelled")
      .map((sale) => sale.id),
  );
  const receivedCredit = props.ledger
    .filter(
      (entry) =>
        entry.type === "payment" &&
        (!entry.saleId || !cancelledSaleIds.has(entry.saleId)),
    )
    .reduce((total, entry) => total + entry.amountCents, 0);
  const paidExpenses = props.expenses
    .filter((expense) => expense.paidAt)
    .reduce((total, expense) => total + expense.amountCents, 0);
  const cashSales = props.sales
    .filter(
      (sale) =>
        sale.status === "completed" && sale.paymentMethod !== "credit",
    )
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
  const totalSales = props.sales
    .filter((sale) => sale.status === "completed")
    .reduce((sum, sale) => sum + sale.totalCents, 0);
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

const notificationStatus: Record<string, string> = {
  pending: "PENDENTE",
  scheduled: "AGENDADA",
  sending: "ENVIANDO",
  sent: "ENVIADA",
  partial: "PARCIAL",
  failed: "FALHOU",
  cancelled: "CANCELADA",
};

function NotificationsModule(props: Props) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [targetUrl, setTargetUrl] = useState("/catalogo");
  const [audience, setAudience] = useState("all");
  const [scheduledAt, setScheduledAt] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function chooseTemplate(id: string) {
    setTemplateId(id);
    const template = props.notificationTemplates.find((item) => item.id === id);
    if (!template) return;
    setTitle(template.title);
    setBody(template.body);
    setTargetUrl(template.targetUrl);
  }

  async function dispatch(sendNow: boolean) {
    setBusy(true);
    setError("");
    try {
      await props.createNotification({
        title,
        body,
        targetUrl,
        audience,
        scheduledAt,
        templateId: templateId || null,
        sendNow,
      });
      props.notify(sendNow ? "NOTIFICAÇÃO DISPARADA" : "NOTIFICAÇÃO AGENDADA");
      setTitle("");
      setBody("");
      setScheduledAt("");
      setTemplateId("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Falha no disparo.");
    } finally {
      setBusy(false);
    }
  }

  async function saveTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setError("");
    try {
      await props.createNotificationTemplate({
        name: data.get("name"),
        title: data.get("template_title"),
        body: data.get("template_body"),
        targetUrl: data.get("template_url"),
      });
      form.reset();
      props.notify("TEMPLATE SALVO");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Falha ao salvar template.");
    } finally {
      setBusy(false);
    }
  }

  const scheduledCount = props.notificationCampaigns.filter(
    (campaign) => campaign.status === "scheduled",
  ).length;
  const sentCount = props.notificationCampaigns.filter((campaign) =>
    ["sent", "partial"].includes(campaign.status),
  ).length;

  return (
    <section className="space-y-5 px-4 py-5">
      <ModuleHeader
        code="SETOR // 08"
        title="Central de notificações"
        description="Dispare comunicados agora, agende campanhas e reutilize templates."
        onBack={props.onBack}
      />

      <div className="grid grid-cols-3 gap-3">
        <DataCard title="Aparelhos" index="PUSH">
          <strong className="text-2xl font-black">{props.pushRecipients.length}</strong>
        </DataCard>
        <DataCard title="Agendadas" index="FILA">
          <strong className="text-2xl font-black text-[#A91D11]">{scheduledCount}</strong>
        </DataCard>
        <DataCard title="Enviadas" index="HIST">
          <strong className="text-2xl font-black">{sentCount}</strong>
        </DataCard>
      </div>

      {props.pushRecipients.length === 0 && (
        <div className="border-4 border-[#1A1A1A] bg-yellow-300 p-4 font-mono text-[10px] font-black uppercase leading-5">
          Ainda não há aparelhos inscritos. O morador precisa abrir o Catálogo dos Camaradas e tocar em “Ativar notificações”.
        </div>
      )}

      <div className="space-y-4 border-4 border-[#1A1A1A] bg-gray-200 p-4 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
        <h3 className="border-b-2 border-[#1A1A1A] pb-2 text-sm font-black uppercase">Novo comunicado</h3>
        <label className="block">
          <span className="mb-2 block text-xs font-black uppercase">Carregar template</span>
          <select value={templateId} onChange={(event) => chooseTemplate(event.target.value)} className="w-full rounded-none border-2 border-[#1A1A1A] bg-white p-3 font-mono text-xs font-black uppercase">
            <option value="">SEM TEMPLATE</option>
            {props.notificationTemplates.map((template) => (
              <option key={template.id} value={template.id}>{template.name}</option>
            ))}
          </select>
        </label>
        <TextInput label="Título da notificação" value={title} maxLength={80} onChange={(event) => setTitle(event.target.value)} placeholder="EX.: REPOSIÇÃO CONCLUÍDA" />
        <label className="block">
          <span className="mb-2 block text-xs font-black uppercase tracking-[0.08em]">Mensagem</span>
          <textarea value={body} maxLength={240} onChange={(event) => setBody(event.target.value)} rows={4} placeholder="ESCREVA O COMUNICADO..." className="w-full resize-none rounded-none border-4 border-[#1A1A1A] bg-white px-3 py-3 font-mono text-xs font-bold uppercase outline-none shadow-[3px_3px_0px_0px_rgba(26,26,26,1)]" />
          <small className="mt-1 block text-right font-mono text-[9px] font-black">{body.length}/240</small>
        </label>
        <TextInput label="Abrir ao tocar" value={targetUrl} onChange={(event) => setTargetUrl(event.target.value)} placeholder="/catalogo" />
        <label className="block">
          <span className="mb-2 block text-xs font-black uppercase">Destinatários</span>
          <select value={audience} onChange={(event) => setAudience(event.target.value)} className="w-full rounded-none border-2 border-[#1A1A1A] bg-white p-3 font-mono text-xs font-black uppercase">
            <option value="all">TODOS OS APARELHOS ATIVOS</option>
            {props.pushRecipients.map((recipient) => (
              <option key={recipient.id} value={`subscription:${recipient.id}`}>{recipient.label}</option>
            ))}
          </select>
        </label>
        <button type="button" disabled={busy || !title.trim() || !body.trim()} onClick={() => void dispatch(true)} className="w-full rounded-none border-4 border-[#1A1A1A] bg-[#A91D11] px-4 py-4 text-sm font-black uppercase tracking-[0.1em] text-white shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] disabled:opacity-50">
          Disparar agora
        </button>
        <div className="border-t-4 border-[#1A1A1A] pt-4">
          <TextInput label="Data e hora do agendamento" type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} />
          <button type="button" disabled={busy || !title.trim() || !body.trim() || !scheduledAt} onClick={() => void dispatch(false)} className="mt-4 w-full rounded-none border-4 border-[#1A1A1A] bg-white px-4 py-3 text-xs font-black uppercase shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] disabled:opacity-50">
            Agendar comunicado
          </button>
        </div>
      </div>

      <form onSubmit={saveTemplate} className="space-y-4 border-4 border-[#1A1A1A] bg-white p-4">
        <h3 className="border-b-2 border-[#1A1A1A] pb-2 text-sm font-black uppercase">Criar template</h3>
        <TextInput label="Nome interno" name="name" required placeholder="EX.: REPOSIÇÃO" />
        <TextInput label="Título" name="template_title" required maxLength={80} />
        <label className="block">
          <span className="mb-2 block text-xs font-black uppercase">Mensagem padrão</span>
          <textarea name="template_body" required maxLength={240} rows={3} className="w-full resize-none rounded-none border-4 border-[#1A1A1A] bg-gray-100 p-3 font-mono text-xs font-bold uppercase outline-none" />
        </label>
        <TextInput label="Destino" name="template_url" defaultValue="/catalogo" />
        <PrimaryButton type="submit" disabled={busy} className="w-full">Salvar template</PrimaryButton>
      </form>

      {props.notificationTemplates.length > 0 && (
        <DataCard title="Templates salvos" index={`${props.notificationTemplates.length}`}>
          <div className="divide-y-2 divide-[#1A1A1A] border-y-2 border-[#1A1A1A]">
            {props.notificationTemplates.map((template) => (
              <div key={template.id} className="grid grid-cols-[1fr_auto] gap-3 py-3">
                <button type="button" onClick={() => chooseTemplate(template.id)} className="text-left">
                  <strong className="block text-xs font-black uppercase">{template.name}</strong>
                  <small className="font-mono text-[9px] uppercase">{template.title}</small>
                </button>
                <button type="button" onClick={() => void props.deleteNotificationTemplate(template.id).catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Falha."))} className="border-2 border-[#1A1A1A] bg-[#A91D11] px-2 font-mono text-[9px] font-black uppercase text-white">Excluir</button>
              </div>
            ))}
          </div>
        </DataCard>
      )}

      <DataCard title="Histórico de comunicados" index={`${props.notificationCampaigns.length}`}>
        {props.notificationCampaigns.length === 0 ? (
          <p className="font-mono text-xs uppercase">Nenhum comunicado registrado.</p>
        ) : (
          <div className="max-h-[520px] overflow-y-auto divide-y-2 divide-[#1A1A1A] border-y-2 border-[#1A1A1A]">
            {props.notificationCampaigns.map((campaign) => (
              <article key={campaign.id} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <strong className="text-xs font-black uppercase">{campaign.title}</strong>
                  <span className="border-2 border-[#1A1A1A] bg-gray-200 px-2 py-1 font-mono text-[8px] font-black">{notificationStatus[campaign.status] ?? campaign.status}</span>
                </div>
                <p className="mt-2 font-mono text-[9px] uppercase leading-4">{campaign.body}</p>
                <p className="mt-2 font-mono text-[8px] font-black uppercase text-gray-600">
                  {campaign.scheduledAt ? `PREVISTA: ${new Date(campaign.scheduledAt).toLocaleString("pt-BR")}` : `CRIADA: ${new Date(campaign.createdAt.replace(" ", "T") + "Z").toLocaleString("pt-BR")}`}
                  {` // OK ${campaign.sentCount} // FALHAS ${campaign.failedCount}`}
                </p>
                {campaign.status === "scheduled" && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button type="button" disabled={busy} onClick={() => void props.updateNotification(campaign.id, "sendNow").then(() => props.notify("NOTIFICAÇÃO DISPARADA")).catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Falha."))} className="border-2 border-[#1A1A1A] bg-[#A91D11] p-2 font-mono text-[9px] font-black uppercase text-white">Enviar agora</button>
                    <button type="button" disabled={busy} onClick={() => void props.updateNotification(campaign.id, "cancel").then(() => props.notify("AGENDAMENTO CANCELADO")).catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Falha."))} className="border-2 border-[#1A1A1A] bg-white p-2 font-mono text-[9px] font-black uppercase">Cancelar</button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </DataCard>
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
  if (props.section === "sales") return <SalesCancellationModule {...props} />;
  if (props.section === "customers") return <CustomersModule {...props} />;
  if (props.section === "cash") return <CashModule {...props} />;
  if (props.section === "suppliers") return <SuppliersModule {...props} />;
  if (props.section === "reports") return <ReportsModule {...props} />;
  if (props.section === "staff") return <StaffModule {...props} />;
  if (props.section === "notifications") return <NotificationsModule {...props} />;
  return <SettingsModule {...props} />;
}
