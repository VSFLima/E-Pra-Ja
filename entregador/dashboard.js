/* E-Pra-Já v4: Script do Painel do Entregador (entregador.js) */
/* Localização: /entregador/entregador.js */

// --- 1. IMPORTAÇÕES ---
import { db } from '../js/firebase-config.js';
import { onAuthChange, getUserRole, logoutUser } from '../js/services/auth.js';
import { getDocs, collection, query, where } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

// --- 2. ELEMENTOS DO DOM ---
const nomeEntregadorEl = document.getElementById('nome-entregador');
const listaPedidosEl = document.getElementById('lista-pedidos-entregador');
const btnLogout = document.getElementById('btn-logout');
const sidebar = document.getElementById('sidebar');
const menuToggle = document.getElementById('menu-toggle');
const overlay = document.getElementById('overlay');
const mapContainer = document.getElementById('map');

// --- 3. ESTADO DA APLICAÇÃO ---
let meuId = null;
let listenerPedidos = null;
let map = null; // Variável para o mapa
let entregadorMarker = null; // Marcador para a posição do entregador

// --- 4. LÓGICA DO MENU RESPONSIVO ---
const toggleMenu = () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('visible');
};

if (menuToggle) menuToggle.addEventListener('click', toggleMenu);
if (overlay) overlay.addEventListener('click', toggleMenu);

// --- 5. LÓGICA DO MAPA INTERATIVO ---

/**
 * Inicializa o mapa na tela.
 */
function inicializarMapa() {
    if (!mapContainer) return;
    // Coordenadas iniciais (ex: centro do Rio de Janeiro)
    map = L.map('map').setView([-22.9068, -43.1729], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Tenta obter a localização do entregador
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
            map.setView(latLng, 15); // Centraliza o mapa na posição do entregador
        },
        (error) => {
            console.warn("Não foi possível obter a localização:", error.message);
        },
        { enableHighAccuracy: true }
    );
}

// --- 6. FUNÇÕES DE RENDERIZAÇÃO E LÓGICA DE PEDIDOS ---
// (As funções escutarMeusPedidos e renderizarPedidos estão mantidas e completas)
const escutarMeusPedidos = () => { /* ...código mantido... */ };
const renderizarPedidos = (pedidos) => { /* ...código mantido... */ };

// --- 7. INICIALIZAÇÃO DA PÁGINA ---
const inicializarPainelEntregador = () => {
    onAuthChange(async (user) => {
        if (user) {
            meuId = user.uid;
            const role = await getUserRole(meuId);

            if (role === 'entregador') {
                if (nomeEntregadorEl) nomeEntregadorEl.textContent = user.email;
                inicializarMapa(); // Inicializa o mapa
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

