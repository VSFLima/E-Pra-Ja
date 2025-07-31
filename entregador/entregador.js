/* E-Pra-Já v2: Script do Painel do Entregador (entregador.js) */
/* Localização: /entregador/entregador.js */

// --- 1. IMPORTAÇÕES ---
import { onAuthChange, getUserRole, logoutUser } from '../js/services/auth.js';
import { db } from '../js/firebase-config.js';
import { getDocs, collection, query, where, doc, updateDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- 2. ELEMENTOS DO DOM ---
const nomeEntregadorEl = document.getElementById('nome-entregador');
const listaPedidosEl = document.getElementById('lista-pedidos-entregador');
const btnLogout = document.getElementById('btn-logout');
let meuId = null;
let listenerPedidos = null; // Para controlar o listener em tempo real

// --- 3. FUNÇÕES DE RENDERIZAÇÃO E LÓGICA ---

/**
 * Inicia o listener para buscar e exibir os pedidos atribuídos ao entregador em tempo real.
 */
const escutarMeusPedidos = () => {
    if (!listaPedidosEl || !meuId) return;

    // Query para buscar em todos os restaurantes.
    // NOTA: Para otimizar no futuro, uma coleção 'entregas' de nível superior seria ideal.
    const restaurantesRef = collection(db, "restaurantes");
    
    // onSnapshot escuta por mudanças em todos os restaurantes
    listenerPedidos = onSnapshot(restaurantesRef, async (restaurantesSnapshot) => {
        listaPedidosEl.innerHTML = '<p>A procurar entregas...</p>';
        let todosOsMeusPedidos = [];

        for (const restauranteDoc of restaurantesSnapshot.docs) {
            const restauranteId = restauranteDoc.id;
            const pedidosRef = collection(db, "restaurantes", restauranteId, "pedidos");
            
            // Query para pedidos atribuídos a mim e que saíram para entrega
            const q = query(pedidosRef, where("entregadorId", "==", meuId), where("status", "==", "Saiu para entrega"));
            const pedidosSnapshot = await getDocs(q);

            pedidosSnapshot.forEach(pedidoDoc => {
                todosOsMeusPedidos.push({
                    ...pedidoDoc.data(),
                    id: pedidoDoc.id,
                    restauranteId: restauranteId
                });
            });
        }
        renderizarPedidos(todosOsMeusPedidos);
    });
};

/**
 * Renderiza os cartões de pedido na tela com as novas ações.
 * @param {Array} pedidos - A lista de pedidos a ser exibida.
 */
const renderizarPedidos = (pedidos) => {
    listaPedidosEl.innerHTML = '';

    if (pedidos.length === 0) {
        listaPedidosEl.innerHTML = '<p>Não há nenhuma entrega para você no momento.</p>';
        return;
    }

    pedidos.forEach(pedido => {
        const enderecoCompleto = pedido.clienteInfo.endereco || 'Endereço não informado';
        const telefoneCliente = pedido.clienteInfo.whatsapp; // Assumindo que o número está completo (ex: 5521988887777)
        
        const linkMaps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(enderecoCompleto)}`;
        const mensagemWhats = encodeURIComponent('Olá, cheguei ao local de entrega');
        const linkWhats = `https://wa.me/${telefoneCliente}?text=${mensagemWhats}`;

        const pedidoCard = document.createElement('div');
        pedidoCard.className = 'pedido-card'; // Estilo definido em panel.css
        pedidoCard.innerHTML = `
            <div class="card-header">
                <h3>Pedido #${pedido.id.substring(0, 6)}</h3>
                <span>Para: <strong>${pedido.clienteInfo.nome}</strong></span>
            </div>
            <div class="card-body">
                <p><strong>Endereço:</strong> ${enderecoCompleto}</p>
                <p><strong>Total a cobrar:</strong> R$ ${pedido.total.toFixed(2)}</p>
                <p><strong>Pagamento:</strong> ${pedido.metodoPagamento}</p>
            </div>
            <div class="entregador-actions">
                <a href="${linkMaps}" target="_blank" class="btn btn-mapa">Ver Rota</a>
                <a href="${linkWhats}" target="_blank" class="btn btn-whatsapp">Contactar Cliente</a>
            </div>
            <button class="btn btn-sucesso btn-entregue" data-pedido-id="${pedido.id}" data-restaurante-id="${pedido.restauranteId}">Marcar como Entregue</button>
        `;
        listaPedidosEl.appendChild(pedidoCard);
    });
};

// --- 4. FUNÇÃO PRINCIPAL E CONTROLO DE ACESSO ---
const inicializarPainelEntregador = () => {
    onAuthChange(async (user) => {
        if (user) {
            meuId = user.uid;
            const role = await getUserRole(meuId);

            if (role === 'entregador') {
                if (nomeEntregadorEl) nomeEntregadorEl.textContent = user.email;
                escutarMeusPedidos(); // Inicia o listener em tempo real
            } else {
                window.location.href = '/login.html';
            }
        } else {
            window.location.href = '/login.html';
        }
    });
};

// --- 5. EVENT LISTENERS ---
btnLogout.addEventListener('click', () => {
    if (listenerPedidos) listenerPedidos(); // Para de escutar os pedidos ao sair
    logoutUser();
    window.location.href = '/login.html';
});

listaPedidosEl.addEventListener('click', async (event) => {
    if (event.target.classList.contains('btn-entregue')) {
        const btn = event.target;
        const pedidoId = btn.dataset.pedidoId;
        const restauranteId = btn.dataset.restauranteId;

        if (confirm('Tem certeza que deseja marcar este pedido como entregue?')) {
            try {
                btn.disabled = true;
                btn.textContent = 'Atualizando...';
                const pedidoRef = doc(db, "restaurantes", restauranteId, "pedidos", pedidoId);
                await updateDoc(pedidoRef, { status: "Entregue" });
                // A atualização em tempo real do onSnapshot removerá o card automaticamente.
            } catch (error) {
                console.error("Erro ao marcar como entregue:", error);
                alert('Ocorreu um erro. Tente novamente.');
                btn.disabled = false;
                btn.textContent = 'Marcar como Entregue';
            }
        }
    }
});

// --- 6. EXECUÇÃO ---
document.addEventListener('DOMContentLoaded', inicializarPainelEntregador);

