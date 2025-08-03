
/* E-Pra-Já v4: Script do Painel do Entregador (entregador.js) */
/* Localização: /entregador/entregador.js */

// --- 1. IMPORTAÇÕES ---
import { db } from '../js/firebase-config.js';
import { onAuthChange, getUserRole, logoutUser } from '../js/services/auth.js';
import { getDocs, collection, query, where, doc, updateDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- 2. ELEMENTOS DO DOM ---
const nomeEntregadorEl = document.getElementById('nome-entregador');
const listaPedidosEl = document.getElementById('lista-pedidos-entregador');
const btnLogout = document.getElementById('btn-logout');
// Elementos para o menu responsivo
const sidebar = document.getElementById('sidebar');
const menuToggle = document.getElementById('menu-toggle');
const overlay = document.getElementById('overlay');
const mapContainer = document.getElementById('map');

// --- 3. ESTADO DA APLICAÇÃO ---
let meuId = null;
let listenerPedidos = null;
let map = null;
let entregadorMarker = null;

// --- 4. LÓGICA DO MENU RESPONSIVO ---
const toggleMenu = () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('visible');
};

if (menuToggle) menuToggle.addEventListener('click', toggleMenu);
if (overlay) overlay.addEventListener('click', toggleMenu);

// --- 5. LÓGICA DO MAPA INTERATIVO ---
function inicializarMapa() {
    if (!mapContainer) return;
    map = L.map('map').setView([-22.9068, -43.1729], 13); // Centro do Rio de Janeiro

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    navigator.geolocation.watchPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            const latLng = [latitude, longitude];
            
            if (entregadorMarker) {
                entregadorMarker.setLatLng(latLng);
            } else {
                entregadorMarker = L.marker(latLng).addTo(map)
                    .bindPopup('Você está aqui.').openPopup();
            }
            map.setView(latLng, 15);
        },
        (error) => { console.warn("Não foi possível obter a localização:", error.message); },
        { enableHighAccuracy: true }
    );
}

// --- 6. FUNÇÕES DE RENDERIZAÇÃO E LÓGICA DE PEDIDOS ---
const escutarMeusPedidos = () => {
    if (!listaPedidosEl || !meuId) return;

    const restaurantesRef = collection(db, "restaurantes");
    
    listenerPedidos = onSnapshot(restaurantesRef, async (restaurantesSnapshot) => {
        listaPedidosEl.innerHTML = '<p>Procurando entregas...</p>';
        let todosOsMeusPedidos = [];

        for (const restauranteDoc of restaurantesSnapshot.docs) {
            const restauranteId = restauranteDoc.id;
            const pedidosRef = collection(db, "restaurantes", restauranteId, "pedidos");
            
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

const renderizarPedidos = (pedidos) => {
    listaPedidosEl.innerHTML = '';
    if (pedidos.length === 0) {
        listaPedidosEl.innerHTML = '<p>Não há nenhuma entrega para você no momento.</p>';
        return;
    }

    pedidos.forEach(pedido => {
        const enderecoCompleto = pedido.clienteInfo.endereco || 'Endereço não informado';
        const telefoneCliente = pedido.clienteInfo.whatsapp;
        
        const linkMaps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(enderecoCompleto)}`;
        const mensagemWhats = encodeURIComponent('Olá, cheguei ao local de entrega');
        const linkWhats = `https://wa.me/${telefoneCliente}?text=${mensagemWhats}`;

        const pedidoCard = document.createElement('div');
        pedidoCard.className = 'dashboard-card';
        pedidoCard.innerHTML = `
            <div class="card-header">
                <h3>Pedido #${pedido.id.substring(0, 6)}</h3>
                <span>Para: <strong>${pedido.clienteInfo.nome}</strong></span>
            </div>
            <div style="padding: 1rem 0;">
                <p><strong>Endereço:</strong> ${enderecoCompleto}</p>
                <p><strong>Total a cobrar:</strong> R$ ${pedido.total.toFixed(2)}</p>
                <p><strong>Pagamento:</strong> ${pedido.metodoPagamento}</p>
            </div>
            <div class="entregador-actions">
                <a href="${linkMaps}" target="_blank" class="btn btn-mapa">Ver Rota</a>
                <a href="${linkWhats}" target="_blank" class="btn btn-whatsapp">Contactar Cliente</a>
            </div>
            <button class="btn btn-primario btn-entregue" data-pedido-id="${pedido.id}" data-restaurante-id="${pedido.restauranteId}" style="width: 100%; margin-top: 1rem;">Marcar como Entregue</button>
        `;
        listaPedidosEl.appendChild(pedidoCard);
    });
};

// --- 7. INICIALIZAÇÃO DA PÁGINA ---
const inicializarPainelEntregador = () => {
    onAuthChange(async (user) => {
        if (user) {
            meuId = user.uid;
            const role = await getUserRole(meuId);

            if (role === 'entregador') {
                if (nomeEntregadorEl) nomeEntregadorEl.textContent = user.email;
                inicializarMapa();
                escutarMeusPedidos();
            } else {
                window.location.href = '/paginas/login.html';
            }
        } else {
            window.location.href = '/paginas/login.html';
        }
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
                } catch (error) {
                    console.error("Erro ao marcar como entregue:", error);
                    alert('Ocorreu um erro. Tente novamente.');
                    btn.disabled = false;
                    btn.textContent = 'Marcar como Entregue';
                }
            }
        }
    });

    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            if (listenerPedidos) listenerPedidos();
            logoutUser();
            window.location.href = '/paginas/login.html';
        });
    }
};

document.addEventListener('DOMContentLoaded', inicializarPainelEntregador);

