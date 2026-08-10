"use client";

import { useEffect, useState } from "react";

type PushState = "checking" | "available" | "enabled" | "blocked" | "unsupported";

function applicationServerKey(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const binary = window.atob((value + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function saveSubscription(subscription: PushSubscription, label: string) {
  const serialized = subscription.toJSON();
  const response = await fetch("/api/push/subscriptions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: subscription.endpoint,
      keys: serialized.keys,
      label,
    }),
  });
  const result = (await response.json()) as { error?: string };
  if (!response.ok) throw new Error(result.error || "Não foi possível ativar os avisos.");
}

export function PushSubscriptionCard() {
  const [state, setState] = useState<PushState>("checking");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        setState("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setState("blocked");
        return;
      }
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => navigator.serviceWorker.ready)
        .then((registration) => registration.pushManager.getSubscription())
        .then((subscription) => setState(subscription ? "enabled" : "available"))
        .catch(() => setState("unsupported"));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function enable() {
    setBusy(true);
    setError("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "blocked" : "available");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        const configResponse = await fetch("/api/push/config");
        const config = (await configResponse.json()) as { publicKey?: string; error?: string };
        if (!configResponse.ok || !config.publicKey) {
          throw new Error(config.error || "Chave pública indisponível.");
        }
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey(config.publicKey),
        });
      }
      await saveSubscription(subscription, label.trim() || "CELULAR DE UM CAMARADA");
      setState("enabled");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Falha ao ativar avisos.");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setError("");
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/push/subscriptions", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setState("available");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Falha ao desativar avisos.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="border-b-4 border-[#1A1A1A] bg-white p-5" aria-labelledby="avisos-camaradas">
      <div className="border-4 border-[#1A1A1A] bg-yellow-300 p-4 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
        <p className="font-mono text-[9px] font-black uppercase tracking-[0.14em] text-[#A91D11]">
          Canal oficial // Push
        </p>
        <h2 id="avisos-camaradas" className="mt-1 text-lg font-black uppercase">
          Avisos dos camaradas
        </h2>
        <p className="mt-2 font-mono text-[10px] font-bold uppercase leading-5">
          Receba reposições, ofertas e comunicados diretamente neste celular.
        </p>

        {state === "available" && (
          <div className="mt-4 space-y-3">
            <label className="block">
              <span className="mb-1 block font-mono text-[9px] font-black uppercase">Identifique seu aparelho (opcional)</span>
              <input
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                maxLength={80}
                placeholder="EX.: JOÃO // QUARTO 12"
                className="w-full rounded-none border-2 border-[#1A1A1A] bg-white px-3 py-3 font-mono text-xs font-bold uppercase outline-none"
              />
            </label>
            <button
              type="button"
              disabled={busy}
              onClick={() => void enable()}
              className="w-full rounded-none border-4 border-[#1A1A1A] bg-[#A91D11] px-3 py-3 text-xs font-black uppercase tracking-[0.08em] text-white shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] disabled:opacity-60"
            >
              {busy ? "Ativando..." : "Ativar notificações"}
            </button>
          </div>
        )}

        {state === "enabled" && (
          <div className="mt-4 border-2 border-[#185C35] bg-white p-3">
            <strong className="block font-mono text-xs font-black uppercase text-[#185C35]">[OK] Avisos ativados</strong>
            <button type="button" disabled={busy} onClick={() => void disable()} className="mt-3 border-b-2 border-[#1A1A1A] font-mono text-[9px] font-black uppercase">
              Desativar neste aparelho
            </button>
          </div>
        )}

        {state === "blocked" && (
          <p className="mt-4 border-2 border-[#A91D11] bg-white p-3 font-mono text-[10px] font-black uppercase leading-5 text-[#A91D11]">
            Permissão bloqueada. Libere as notificações nas configurações do navegador.
          </p>
        )}
        {state === "unsupported" && (
          <p className="mt-4 border-2 border-[#1A1A1A] bg-white p-3 font-mono text-[10px] font-black uppercase leading-5">
            Neste iPhone, instale o site na tela inicial e abra por lá. Alguns navegadores não oferecem Web Push.
          </p>
        )}
        {state === "checking" && <p className="mt-4 font-mono text-[10px] font-black uppercase">Verificando aparelho...</p>}
        {error && <p className="mt-3 border-2 border-[#1A1A1A] bg-[#A91D11] p-2 font-mono text-[9px] font-black uppercase text-white">ERRO // {error}</p>}
      </div>
    </section>
  );
}
