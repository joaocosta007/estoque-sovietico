"use client";

import { useEffect, useRef, useState } from "react";

type Tab = "inicio" | "vender" | "estoque" | "mais";

const products = [
  { name: "Café Especial 250g", sku: "CAF-001", stock: 8, price: 29.9, state: "low" },
  { name: "Caneca Cerâmica", sku: "CAN-014", stock: 24, price: 34.0, state: "ok" },
  { name: "Kit Presente Café", sku: "KIT-003", stock: 4, price: 72.9, state: "low" },
];

export function InventoryApp() {
  const [tab, setTab] = useState<Tab>("inicio");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanStatus, setScanStatus] = useState("Aponte para o código");
  const [toast, setToast] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    if (!scannerOpen) return;
    let stream: MediaStream | undefined;
    let timer = 0;

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        const Detector = (
          window as unknown as {
            BarcodeDetector?: new (options: { formats: string[] }) => {
              detect(source: HTMLVideoElement): Promise<Array<{ rawValue: string }>>;
            };
          }
        ).BarcodeDetector;
        if (!Detector || !videoRef.current) {
          setScanStatus("Câmera ativa. Digite o código se o navegador não detectar.");
          return;
        }
        const detector = new Detector({
          formats: ["ean_13", "ean_8", "code_128", "qr_code"],
        });
        const detect = async () => {
          if (!videoRef.current) return;
          const codes = await detector.detect(videoRef.current);
          if (codes[0]) {
            setScanStatus(`Código ${codes[0].rawValue} encontrado`);
            setToast("Café Especial adicionado à venda");
            window.setTimeout(() => setScannerOpen(false), 700);
            return;
          }
          timer = window.setTimeout(detect, 250);
        };
        timer = window.setTimeout(detect, 500);
      } catch {
        setScanStatus("Não foi possível abrir a câmera. Digite o código abaixo.");
      }
    }

    startCamera();
    return () => {
      window.clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [scannerOpen]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function finishSale() {
    setToast("Venda #1048 concluída e estoque atualizado");
    setTab("inicio");
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">QUINTA, 30 JUL</p>
          <h1>{tab === "inicio" ? "Boa tarde, João" : tab === "vender" ? "Nova venda" : tab === "estoque" ? "Estoque" : "Gestão"}</h1>
        </div>
        <button className="avatar" aria-label="Abrir perfil">JP</button>
      </header>

      {tab === "inicio" && (
        <section className="screen" aria-label="Resumo do negócio">
          <article className="balance-card">
            <div>
              <span>Vendas hoje</span>
              <strong>R$ 1.284,50</strong>
              <small>↑ 18% vs. quarta-feira</small>
            </div>
            <div className="sparkline" aria-label="Gráfico de vendas em alta">
              <i /><i /><i /><i /><i /><i /><i />
            </div>
          </article>

          <div className="quick-grid">
            <button onClick={() => setTab("vender")} className="quick primary">
              <b>＋</b><span>Nova venda</span>
            </button>
            <button onClick={() => setScannerOpen(true)} className="quick">
              <b>▣</b><span>Ler código</span>
            </button>
            <button onClick={() => setTab("estoque")} className="quick">
              <b>↳</b><span>Entrada</span>
            </button>
            <button onClick={() => setTab("mais")} className="quick">
              <b>⌁</b><span>Despesa</span>
            </button>
          </div>

          <div className="section-heading">
            <h2>Precisa de atenção</h2>
            <button onClick={() => setTab("estoque")}>Ver estoque</button>
          </div>
          <div className="alerts">
            <button onClick={() => setTab("estoque")} className="alert">
              <span className="alert-icon warning">!</span>
              <span><strong>3 produtos com estoque baixo</strong><small>Reposição sugerida para esta semana</small></span>
              <b>›</b>
            </button>
            <button onClick={() => setTab("mais")} className="alert">
              <span className="alert-icon danger">12</span>
              <span><strong>R$ 486,00 em atraso</strong><small>4 clientes com parcelas vencidas</small></span>
              <b>›</b>
            </button>
          </div>

          <div className="section-heading">
            <h2>Últimas vendas</h2>
            <button>Ver todas</button>
          </div>
          <div className="sales-list">
            {[
              ["#1047", "Marina Costa", "14:32", "R$ 84,90"],
              ["#1046", "Venda rápida", "13:18", "R$ 29,90"],
              ["#1045", "Paulo Mendes", "11:54", "R$ 156,00"],
            ].map(([id, customer, time, value]) => (
              <div className="sale-row" key={id}>
                <span className="receipt">⌑</span>
                <span><strong>{customer}</strong><small>{id} · {time}</small></span>
                <b>{value}</b>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === "vender" && (
        <section className="screen sale-screen">
          <label className="search">
            <span>⌕</span>
            <input placeholder="Produto, SKU ou código" aria-label="Buscar produto" />
            <button onClick={() => setScannerOpen(true)} aria-label="Ler código">▣</button>
          </label>
          <p className="overline">ITENS DA VENDA</p>
          <div className="cart-item">
            <div className="product-thumb coffee">CF</div>
            <span><strong>Café Especial 250g</strong><small>R$ 29,90 · estoque 8</small></span>
            <div className="stepper"><button>−</button><b>1</b><button>+</button></div>
          </div>
          <div className="cart-item">
            <div className="product-thumb kit">KT</div>
            <span><strong>Kit Presente Café</strong><small>R$ 72,90 · baixa 3 insumos</small></span>
            <div className="stepper"><button>−</button><b>1</b><button>+</button></div>
          </div>
          <button className="add-link">＋ Adicionar outro produto</button>
          <div className="checkout">
            <div><span>Subtotal</span><b>R$ 102,80</b></div>
            <div><span>Desconto</span><button>Adicionar</button></div>
            <div className="checkout-total"><span>Total</span><strong>R$ 102,80</strong></div>
            <label>Forma de pagamento<select><option>Pix</option><option>Dinheiro</option><option>Cartão</option><option>Fiado</option></select></label>
            <button className="finish" onClick={finishSale}>Concluir venda</button>
          </div>
        </section>
      )}

      {tab === "estoque" && (
        <section className="screen">
          <label className="search"><span>⌕</span><input placeholder="Buscar no estoque" /><button onClick={() => setScannerOpen(true)}>▣</button></label>
          <div className="filter-row"><button className="active">Todos · 48</button><button>Baixo · 3</button><button>Vencendo · 2</button></div>
          <div className="inventory-list">
            {products.map((product) => (
              <button className="inventory-row" key={product.sku}>
                <span className={`stock-dot ${product.state}`} />
                <span><strong>{product.name}</strong><small>{product.sku} · R$ {product.price.toFixed(2).replace(".", ",")}</small></span>
                <span className={product.state === "low" ? "low-stock" : ""}><b>{product.stock}</b><small>un.</small></span>
              </button>
            ))}
          </div>
          <button className="floating" onClick={() => setToast("Cadastro rápido aberto")}>＋</button>
        </section>
      )}

      {tab === "mais" && (
        <section className="screen">
          <article className="debt-card"><span>A receber</span><strong>R$ 2.436,00</strong><small>R$ 486,00 vencidos</small></article>
          <div className="management-grid">
            {["Clientes", "Fornecedores", "Despesas", "Relatórios", "Equipe e acessos", "Exportar dados", "Orçamentos", "Integrações API"].map((item, index) => (
              <button key={item}><b>{["◎","◇","↘","▥","♙","⇩","□","⌘"][index]}</b><span>{item}</span><i>›</i></button>
            ))}
          </div>
        </section>
      )}

      <nav className="bottom-nav" aria-label="Navegação principal">
        {([
          ["inicio", "⌂", "Início"],
          ["vender", "＋", "Vender"],
          ["estoque", "▦", "Estoque"],
          ["mais", "•••", "Mais"],
        ] as const).map(([id, icon, label]) => (
          <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>
            <b>{icon}</b><span>{label}</span>
          </button>
        ))}
      </nav>

      {scannerOpen && (
        <div className="scanner-modal" role="dialog" aria-modal="true" aria-label="Leitor de código">
          <video ref={videoRef} muted playsInline />
          <div className="scan-frame"><i /><i /><i /><i /></div>
          <div className="scanner-copy"><strong>{scanStatus}</strong><small>EAN-8, EAN-13, Code 128 ou QR Code</small></div>
          <label className="manual-code"><input inputMode="numeric" placeholder="Digitar código" /><button onClick={() => { setToast("Produto localizado"); setScannerOpen(false); }}>Buscar</button></label>
          <button className="close-scanner" onClick={() => setScannerOpen(false)}>Fechar</button>
        </div>
      )}

      {toast && <div className="toast" role="status">✓ {toast}</div>}
    </main>
  );
}
