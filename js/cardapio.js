
/* E-Pra-Já v5: Script da Página do Cardápio (cardapio.js) */
/* Localização: /js/cardapio.js */

// --- 1. IMPORTAÇÕES ---
import { db, auth } from '../firebase-config.js';
import { doc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";
import { criarPedido, salvarPedidoNoHistoricoCliente } from './services/firestore.js';

document.addEventListener('DOMContentLoaded', () => {

    // --- 2. ELEMENTOS DO DOM ---
    const nomeRestauranteEl = document.getElementById('nome-restaurante');
    const logoRestauranteEl = document.getElementById('logo-restaurante');
    const statusLojaEl = document.getElementById('status-loja');
    const listaCardapioEl = document.getElementById('lista-cardapio');
    const carrinhoItensEl = document.getElementById('carrinho-itens');
    const carrinhoTotalEl = document.getElementById('carrinho-total');
    const checkoutBtn = document.getElementById('checkout-btn');
    const modalOverlay = document.getElementById('modal-overlay');
    const fecharModalBtn = document.getElementById('fechar-modal-btn');
    const checkoutForm = document.getElementById('checkout-form');
    const pedidoMinimoAvisoEl = document.getElementById('pedido-minimo-aviso');

    // --- 3. ESTADO DA APLICAÇÃO ---
    let carrinho = [];
    let restauranteId = null;
    let restauranteInfo = {};

    // --- 4. FUNÇÕES DO CARRINHO (ATUALIZADAS) ---
    function adicionarAoCarrinho(item) {
        const itemExistente = carrinho.find(i => i.id === item.id);
        if (itemExistente) {
            itemExistente.qtd++;
        } else {
            carrinho.push({ ...item, qtd: 1 });
        }
        renderizarCarrinho();
    }

    function renderizarCarrinho() {
        carrinhoItensEl.innerHTML = '';
        if (carrinho.length === 0) {
            carrinhoItensEl.innerHTML = '<p>Seu carrinho está vazio.</p>';
        } else {
            carrinho.forEach(item => {
                const itemEl = document.createElement('div');
                itemEl.className = 'carrinho-item'; // Estilo a ser definido em style.css
                itemEl.innerHTML = `
                    <span>${item.qtd}x ${item.nome}</span>
                    <span>R$ ${(item.preco * item.qtd).toFixed(2)}</span>
                `;
                carrinhoItensEl.appendChild(itemEl);
            });
        }
        atualizarTotalCarrinho();
    }

    function atualizarTotalCarrinho() {
        const total = carrinho.reduce((acc, item) => acc + (item.preco * item.qtd), 0);
        carrinhoTotalEl.textContent = `R$ ${total.toFixed(2)}`;

        // Lógica do Pedido Mínimo
        if (restauranteInfo.pedidoMinimo && total > 0) {
            if (total < restauranteInfo.pedidoMinimo) {
                pedidoMinimoAvisoEl.textContent = `Pedido mínimo: R$ ${restauranteInfo.pedidoMinimo.toFixed(2)}`;
                pedidoMinimoAvisoEl.style.display = 'block';
                checkoutBtn.disabled = true;
            } else {
                pedidoMinimoAvisoEl.style.display = 'none';
                checkoutBtn.disabled = false;
            }
        } else {
            pedidoMinimoAvisoEl.style.display = 'none';
            checkoutBtn.disabled = carrinho.length === 0;
        }
    }

    // --- 5. FUNÇÕES DE RENDERIZAÇÃO DA PÁGINA ---
    function renderizarHeaderRestaurante(data) {
        restauranteInfo = data;
        nomeRestauranteEl.textContent = data.nome;
        if (data.info.logoUrl) {
            logoRestauranteEl.src = data.info.logoUrl;
        }
        if (data.lojaAberta) {
            statusLojaEl.textContent = 'Aberto';
            statusLojaEl.className = 'status-loja aberta';
        } else {
            statusLojaEl.textContent = 'Fechado';
            statusLojaEl.className = 'status-loja fechada';
            listaCardapioEl.style.opacity = '0.5';
            listaCardapioEl.style.pointerEvents = 'none';
            checkoutBtn.disabled = true;
        }
        atualizarTotalCarrinho(); // Revalida o pedido mínimo
    }

    function renderizarCardapio(cardapio) {
        // ... (código mantido e completo) ...
    }

    // --- 6. LÓGICA DE CHECKOUT (ATUALIZADA) ---
    async function finalizarPedido(event) {
        event.preventDefault();
        const btn = event.target.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'Enviando...';

        const dadosCliente = {
            nome: checkoutForm.nome.value,
            whatsapp: checkoutForm.whatsapp.value.replace(/\D/g, ''),
            endereco: checkoutForm.endereco.value,
        };

        const dadosPedido = {
            clienteInfo: dadosCliente,
            itens: carrinho.map(i => ({ nome: i.nome, qtd: i.qtd, preco: i.preco })),
            total: carrinho.reduce((acc, item) => acc + (item.preco * item.qtd), 0),
            metodoPagamento: checkoutForm.pagamento.value,
            precisaTrocoPara: parseFloat(checkoutForm.troco.value) || 0,
            status: "Recebido",
            timestamp: new Date()
        };

        try {
            const pedidoRef = await criarPedido(restauranteId, dadosPedido);
            const user = auth.currentUser;
            if (user) {
                await salvarPedidoNoHistoricoCliente(user.uid, dadosPedido, restauranteInfo.nome);
            }

            let mensagem = `*Novo Pedido E-Pra-Já!*\n\n*Cliente:* ${dadosCliente.nome}\n*Endereço:* ${dadosCliente.endereco}\n\n*Itens do Pedido:*\n`;
            dadosPedido.itens.forEach(item => { mensagem += `- ${item.qtd}x ${item.nome}\n`; });
            mensagem += `\n*Total:* R$ ${dadosPedido.total.toFixed(2)}\n*Pagamento:* ${dadosPedido.metodoPagamento}\n`;
            if (dadosPedido.precisaTrocoPara > 0) { mensagem += `(Precisa de troco para R$ ${dadosPedido.precisaTrocoPara.toFixed(2)})\n`; }
            mensagem += `\n*Nº do Pedido:* ${pedidoRef.id.substring(0, 6)}`;

            const numeroRestaurante = restauranteInfo.info.telefone.replace(/\D/g, '');
            const linkWhatsApp = `https://wa.me/${numeroRestaurante}?text=${encodeURIComponent(mensagem)}`;
            
            window.location.href = linkWhatsApp;

        } catch (error) {
            console.error("Erro ao enviar pedido:", error);
            alert('Ocorreu um erro ao enviar seu pedido. Tente novamente.');
            btn.disabled = false;
            btn.textContent = 'Confirmar Pedido';
        }
    }

    // --- 7. INICIALIZAÇÃO DA PÁGINA ---
    async function init() {
        // ... (código mantido e completo) ...
    }

    document.addEventListener('DOMContentLoaded', init);
});

