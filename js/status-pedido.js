/* E-Pra-Já v3: Script da Página de Status do Pedido (status-pedido.js) */
/* Localização: /js/status-pedido.js */

// --- 1. IMPORTAÇÕES ---
import { db } from './firebase-config.js';
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- 2. ELEMENTOS DO DOM ---
// Assumimos que estes IDs existirão no arquivo /paginas/status-pedido.html
const numeroPedidoEl = document.getElementById('numero-pedido');
const statusAtualEl = document.getElementById('status-atual');
const statusSteps = document.querySelectorAll('.status-step'); // Pega todos os passos
const loadingIndicator = document.getElementById('loading-indicator');
const mainContent = document.getElementById('main-content');

// --- 3. FUNÇÕES DE RENDERIZAÇÃO ---

/**
 * Atualiza a interface gráfica para refletir o status atual do pedido.
 * @param {string} status - O status atual do pedido (ex: "Em preparação").
 */
function atualizarStatusUI(status) {
    if (!status) return;

    statusAtualEl.textContent = status;

    const statusOrder = ["Recebido", "Em preparação", "Saiu para entrega", "Entregue"];
    const currentIndex = statusOrder.indexOf(status);

    statusSteps.forEach((step, index) => {
        // Remove todas as classes de estado anteriores
        step.classList.remove('active', 'completed');

        if (index < currentIndex) {
            // Passos já concluídos
            step.classList.add('completed');
        } else if (index === currentIndex) {
            // Passo atual
            step.classList.add('active');
        }
    });
}

// --- 4. INICIALIZAÇÃO DA PÁGINA ---

/**
 * Função principal que lê os IDs da URL e inicia o listener de status.
 */
function init() {
    const params = new URLSearchParams(window.location.search);
    const restauranteId = params.get('restauranteId');
    const pedidoId = params.get('pedidoId');

    if (!restauranteId || !pedidoId) {
        mainContent.innerHTML = '<h1>Erro</h1><p>Link de acompanhamento inválido. Faltam informações do pedido.</p>';
        loadingIndicator.style.display = 'none';
        return;
    }

    if (numeroPedidoEl) {
        // Exibe um ID mais curto e amigável para o cliente
        numeroPedidoEl.textContent = `#${pedidoId.substring(0, 6).toUpperCase()}`;
    }

    // Cria a referência para o documento do pedido específico
    const pedidoRef = doc(db, "restaurantes", restauranteId, "pedidos", pedidoId);

    // onSnapshot é a função mágica que escuta por atualizações em tempo real
    const unsubscribe = onSnapshot(pedidoRef, (docSnap) => {
        loadingIndicator.style.display = 'none';
        mainContent.style.display = 'block';

        if (docSnap.exists()) {
            const pedido = docSnap.data();
            atualizarStatusUI(pedido.status);
        } else {
            mainContent.innerHTML = '<h1>Pedido não encontrado</h1><p>Não foi possível encontrar os detalhes do seu pedido. Verifique o link ou entre em contato com o restaurante.</p>';
            // Para de escutar se o documento for deletado
            unsubscribe();
        }
    }, (error) => {
        console.error("Erro ao escutar o status do pedido:", error);
        mainContent.innerHTML = '<h1>Erro</h1><p>Ocorreu um erro ao tentar acompanhar seu pedido. Tente recarregar a página.</p>';
        loadingIndicator.style.display = 'none';
    });
}

document.addEventListener('DOMContentLoaded', init);

