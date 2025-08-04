/* E-Pra-Já v5: Script Principal do Painel do Restaurante (restaurante.js) */
/* Localização: /restaurante/restaurante.js */

// --- 1. IMPORTAÇÕES ---
import { db } from '../js/firebase-config.js';
import { onAuthChange, getUserRole, logoutUser } from '../js/services/auth.js';
import {
    criarUsuarioEntregador,
    apagarUsuarioCompleto,
    solicitarDesbloqueio,
    salvarItemCardapio,
    apagarItemCardapio,
    atualizarStatusPedido,
    atribuirEntregadorPedido
} from '../js/services/firestore.js';
import { doc, getDoc, collection, query, where, onSnapshot, updateDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    
    // --- 2. ELEMENTOS DO DOM (Globais ao Painel) ---
    const nomeRestauranteEl = document.getElementById('nome-restaurante');
    const btnLogout = document.getElementById('btn-logout');
    const mainContent = document.querySelector('.main-content');
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.getElementById('menu-toggle');
    const overlay = document.getElementById('overlay');
    // Pop-ups
    const billingPopup = document.getElementById('billing-popup');
    const btnJaPaguei = document.getElementById('btn-ja-paguei');
    const linkEnviarComprovante = document.getElementById('link-enviar-comprovante');
    const managerMessagePopup = document.getElementById('manager-message-popup');
    const managerMessageText = document.getElementById('manager-message-text');
    const btnFecharMensagem = document.getElementById('btn-fechar-mensagem');
    
    // --- 3. ESTADO DA APLICAÇÃO ---
    let meuRestauranteId = null;
    let restauranteData = {};
    let mensagensExibidas = new Set();
    
    // --- 4. LÓGICA DO MENU RESPONSIVO ---
    const toggleMenu = () => {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('visible');
    };
    
    if (menuToggle) menuToggle.addEventListener('click', toggleMenu);
    if (overlay) overlay.addEventListener('click', toggleMenu);
    
    // --- 5. LÓGICA DE NEGÓCIO (Cobrança, Mensagens) ---
    function verificarAssinatura(restData) {
        if (!restData.accessValidUntil) return;
        const hoje = new Date();
        const dataValidade = restData.accessValidUntil.toDate();
        
        if (hoje > dataValidade) {
            mainContent.style.filter = 'blur(5px)';
            billingPopup.classList.add('visible');
            if (restData.solicitouDesbloqueio) {
                btnJaPaguei.textContent = 'Aguardando Confirmação do Gestor';
                btnJaPaguei.disabled = true;
            } else {
                btnJaPaguei.textContent = 'Já paguei, liberar meu acesso por confiança';
                btnJaPaguei.disabled = false;
            }
        } else {
            mainContent.style.filter = 'none';
            billingPopup.classList.remove('visible');
        }
    }
    
    function verificarMensagens(restData) {
        onSnapshot(collection(db, "mensagensGlobais"), (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                const msgId = change.doc.id;
                if (change.type === "added" && !mensagensExibidas.has(msgId)) {
                    const msg = change.doc.data();
                    if (msg.grupoAlvo === 'todos' || msg.grupoAlvo === restData.statusPagamento || msg.grupoAlvo === restData.status) {
                        managerMessageText.textContent = msg.texto;
                        managerMessagePopup.classList.add('visible');
                        mensagensExibidas.add(msgId);
                    }
                }
            });
        });
    }
    
    // --- 6. LISTENERS DE POP-UPS ---
    btnFecharMensagem.addEventListener('click', () => managerMessagePopup.classList.remove('visible'));
    btnJaPaguei.addEventListener('click', async () => {
        btnJaPaguei.disabled = true;
        btnJaPaguei.textContent = 'Processando...';
        await solicitarDesbloqueio(meuRestauranteId);
        linkEnviarComprovante.style.display = 'block';
    });
    
    // --- 7. INICIALIZAÇÃO DO PAINEL ---
    async function inicializarPainelRestaurante() {
        onAuthChange(async (user) => {
            if (user) {
                const role = await getUserRole(user.uid);
                if (role === 'restaurante') {
                    meuRestauranteId = user.uid;
                    const restauranteRef = doc(db, "restaurantes", meuRestauranteId);
                    
                    onSnapshot(restauranteRef, (docSnap) => {
                        if (docSnap.exists()) {
                            restauranteData = docSnap.data();
                            nomeRestauranteEl.textContent = restauranteData.nome;
                            verificarAssinatura(restauranteData);
                        } else {
                            alert("Erro: não foi possível encontrar os dados do seu restaurante.");
                            logoutUser();
                            window.location.href = '/paginas/login.html';
                        }
                    });
                    
                    // Inicia a verificação de mensagens do gestor
                    verificarMensagens(restauranteData);
                    
                } else { window.location.href = '/paginas/login.html'; }
            } else { window.location.href = '/paginas/login.html'; }
        });
    }
    
    if (btnLogout) btnLogout.addEventListener('click', () => { logoutUser();
        window.location.href = '/paginas/login.html'; });
    
    inicializarPainelRestaurante();
});