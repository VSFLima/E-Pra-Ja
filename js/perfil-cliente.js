/* E-Pra-Já v3: Script da Página de Perfil do Cliente (perfil-cliente.js) */
/* Localização: /js/perfil-cliente.js */

// --- 1. IMPORTAÇÕES ---
import { db } from './firebase-config.js';
import { onAuthChange, getUserRole, logoutUser } from './services/auth.js';
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- 2. ELEMENTOS DO DOM ---
// Assumimos que estes IDs existirão no arquivo /paginas/perfil-cliente.html
const nomeClienteEl = document.getElementById('nome-cliente');
const emailClienteEl = document.getElementById('email-cliente');
const historicoPedidosListaEl = document.getElementById('historico-pedidos-lista');
const loadingIndicator = document.getElementById('loading-indicator');
const btnLogout = document.getElementById('btn-logout');

// --- 3. FUNÇÕES DE RENDERIZAÇÃO ---

/**
 * Busca e exibe o histórico de pedidos do cliente.
 * @param {string} userId - O ID do cliente logado.
 */
async function carregarHistorico(userId) {
  if (!userId) return;
  
  try {
    const historicoRef = collection(db, "utilizadores", userId, "historicoPedidos");
    // Ordena os pedidos do mais recente para o mais antigo
    const q = query(historicoRef, orderBy("timestamp", "desc"));
    const querySnapshot = await getDocs(q);
    
    historicoPedidosListaEl.innerHTML = '';
    if (querySnapshot.empty) {
      historicoPedidosListaEl.innerHTML = '<p>Você ainda não fez nenhum pedido.</p>';
      return;
    }
    
    querySnapshot.forEach(doc => {
      const pedido = doc.data();
      const pedidoCard = document.createElement('div');
      pedidoCard.className = 'pedido-card-historico'; // Estilo a ser definido no CSS
      
      const dataPedido = pedido.timestamp.toDate().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
      
      pedidoCard.innerHTML = `
                <div class="pedido-header">
                    <h4>Pedido em ${pedido.nomeRestaurante}</h4>
                    <span>${dataPedido}</span>
                </div>
                <div class="pedido-body">
                    <p><strong>Itens:</strong> ${pedido.itens.map(item => `${item.qtd}x ${item.nome}`).join(', ')}</p>
                    <p><strong>Total:</strong> R$ ${pedido.total.toFixed(2)}</p>
                </div>
                <div class="pedido-footer">
                    <span>Status: <strong>${pedido.status}</strong></span>
                </div>
            `;
      historicoPedidosListaEl.appendChild(pedidoCard);
    });
    
  } catch (error) {
    console.error("Erro ao carregar histórico de pedidos:", error);
    historicoPedidosListaEl.innerHTML = '<p style="color: red;">Não foi possível carregar seu histórico.</p>';
  } finally {
    if (loadingIndicator) loadingIndicator.style.display = 'none';
  }
}

// --- 4. INICIALIZAÇÃO DA PÁGINA ---

/**
 * Função principal que verifica a autenticação e carrega os dados do perfil.
 */
function init() {
  onAuthChange(async (user) => {
    if (user) {
      const role = await getUserRole(user.uid);
      // Esta página é para clientes, mas um gestor também poderia visualizá-la.
      // Por enquanto, focaremos apenas no cliente.
      if (role === 'cliente') {
        if (nomeClienteEl) nomeClienteEl.textContent = user.displayName || user.email;
        if (emailClienteEl) emailClienteEl.textContent = user.email;
        carregarHistorico(user.uid);
      } else {
        // Se um restaurante ou entregador tentar acessar, redireciona.
        // Um gestor poderia ter uma lógica diferente no futuro.
        alert("Esta área é apenas para clientes.");
        window.location.href = '/';
      }
    } else {
      // Redireciona para o login se não estiver autenticado
      window.location.href = '/paginas/login.html';
    }
  });
  
  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      logoutUser();
      window.location.href = '/';
    });
  }
}

document.addEventListener('DOMContentLoaded', init);