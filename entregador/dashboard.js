/* E-Pra-Já v5: Script do Dashboard do Entregador (dashboard.js) */
/* Localização: /entregador/dashboard.js */

// --- 1. IMPORTAÇÕES ---
import { db } from '../js/firebase-config.js';
import { onAuthChange, getUserRole, logoutUser } from '../js/services/auth.js';
import { getHistoricoEntregador } from '../js/services/firestore.js';

document.addEventListener('DOMContentLoaded', () => {

    // --- 2. ELEMENTOS DO DOM ---
    const ganhosHojeEl = document.getElementById('ganhos-hoje');
    const ganhosSemanaEl = document.getElementById('ganhos-semana');
    const historicoEntregasListaEl = document.getElementById('historico-entregas-lista');
    const btnLogout = document.getElementById('btn-logout');
    // Elementos para o menu responsivo
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.getElementById('menu-toggle');
    const overlay = document.getElementById('overlay');

    // --- 3. ESTADO DA APLICAÇÃO ---
    let meuId = null;

    // --- 4. LÓGICA DO MENU RESPONSIVO ---
    const toggleMenu = () => {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('visible');
    };

    if (menuToggle) menuToggle.addEventListener('click', toggleMenu);
    if (overlay) overlay.addEventListener('click', toggleMenu);

    // --- 5. FUNÇÕES DE CÁLCULO E RENDERIZAÇÃO ---

    /**
     * Busca todos os pedidos concluídos de um entregador e gera o dashboard.
     */
    async function gerarDashboard() {
        if (!meuId) return;

        try {
            const todasAsEntregas = await getHistoricoEntregador(meuId);

            calcularErenderizarGanhos(todasAsEntregas);
            renderizarHistorico(todasAsEntregas);

        } catch (error) {
            console.error("Erro ao gerar dashboard:", error);
            historicoEntregasListaEl.innerHTML = '<p style="color: red;">Erro ao carregar seu histórico.</p>';
        }
    }

    /**
     * Calcula e exibe os ganhos do dia e da semana.
     * @param {Array} entregas - Lista de todas as entregas concluídas.
     */
    function calcularErenderizarGanhos(entregas) {
        let ganhosHoje = 0;
        let ganhosSemana = 0;
        const hoje = new Date();
        const inicioDoDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
        const inicioDaSemana = new Date(hoje.setDate(hoje.getDate() - 7));

        entregas.forEach(entrega => {
            const dataEntrega = entrega.timestamp.toDate();
            const taxa = entrega.taxaDeEntrega || 0;

            if (dataEntrega >= inicioDoDia) {
                ganhosHoje += taxa;
            }
            if (dataEntrega >= inicioDaSemana) {
                ganhosSemana += taxa;
            }
        });

        ganhosHojeEl.textContent = `R$ ${ganhosHoje.toFixed(2)}`;
        ganhosSemanaEl.textContent = `R$ ${ganhosSemana.toFixed(2)}`;
    }

    /**
     * Renderiza a lista de histórico de entregas.
     * @param {Array} entregas - Lista de todas as entregas concluídas.
     */
    function renderizarHistorico(entregas) {
        historicoEntregasListaEl.innerHTML = '';
        if (entregas.length === 0) {
            historicoEntregasListaEl.innerHTML = '<p>Você ainda não completou nenhuma entrega.</p>';
            return;
        }

        entregas.forEach(entrega => {
            const itemEl = document.createElement('div');
            itemEl.className = 'historico-entrega';
            const dataFormatada = entrega.timestamp.toDate().toLocaleDateString('pt-BR');
            
            itemEl.innerHTML = `
                <div>
                    <strong>Pedido #${entrega.id.substring(0, 6)}</strong>
                    <span style="color: var(--cor-texto-suave); font-size: 0.9rem; display: block;">${dataFormatada}</span>
                </div>
                <strong style="color: var(--cor-sucesso);">+ R$ ${(entrega.taxaDeEntrega || 0).toFixed(2)}</strong>
            `;
            historicoEntregasListaEl.appendChild(itemEl);
        });
    }

    // --- 6. INICIALIZAÇÃO DA PÁGINA ---
    const inicializarDashboard = () => {
        onAuthChange(async (user) => {
            if (user) {
                meuId = user.uid;
                const role = await getUserRole(meuId);
                if (role === 'entregador') {
                    gerarDashboard();
                } else {
                    window.location.href = '/paginas/login.html';
                }
            } else {
                window.location.href = '/paginas/login.html';
            }
        });

        if (btnLogout) {
            btnLogout.addEventListener('click', () => {
                logoutUser();
                window.location.href = '/paginas/login.html';
            });
        }
    };

    inicializarDashboard();
});

