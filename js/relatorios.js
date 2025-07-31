/* E-Pra-Já v3: Script da Página de Relatórios (relatorios.js) */
/* Localização: /js/relatorios.js */

// --- 1. IMPORTAÇÕES ---
import { db } from './firebase-config.js';
import { onAuthChange, getUserRole } from './services/auth.js';
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- 2. ELEMENTOS DO DOM ---
// Assumimos que estes IDs existirão no arquivo /restaurante/relatorios.html
const totalVendasEl = document.getElementById('total-vendas');
const totalPedidosEl = document.getElementById('total-pedidos');
const ticketMedioEl = document.getElementById('ticket-medio');
const itensMaisVendidosListaEl = document.getElementById('itens-mais-vendidos-lista');
const loadingIndicator = document.getElementById('loading-indicator');

// --- 3. FUNÇÕES DE CÁLCULO E RENDERIZAÇÃO ---

/**
 * Busca todos os pedidos de um restaurante e processa os dados para gerar relatórios.
 * @param {string} restauranteId - O ID do restaurante.
 */
async function gerarRelatorios(restauranteId) {
    if (!restauranteId) return;

    try {
        loadingIndicator.style.display = 'block';

        const pedidosRef = collection(db, "restaurantes", restauranteId, "pedidos");
        const querySnapshot = await getDocs(pedidosRef);

        let totalVendas = 0;
        let totalPedidos = 0;
        const contagemItens = {}; // Objeto para contar a quantidade de cada item

        querySnapshot.forEach(doc => {
            const pedido = doc.data();

            // Considera apenas pedidos finalizados (status 'Entregue') para o total de vendas.
            if (pedido.status === 'Entregue') {
                totalVendas += pedido.total;
            }
            
            totalPedidos++;

            // Processa os itens vendidos
            pedido.itens.forEach(item => {
                if (contagemItens[item.nome]) {
                    contagemItens[item.nome] += item.qtd;
                } else {
                    contagemItens[item.nome] = item.qtd;
                }
            });
        });

        // Calcula o ticket médio
        const ticketMedio = totalPedidos > 0 ? totalVendas / totalPedidos : 0;

        // Converte o objeto de contagem em um array, ordena e pega os 5 mais vendidos
        const itensMaisVendidos = Object.entries(contagemItens)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5);

        // Renderiza os resultados na tela
        totalVendasEl.textContent = `R$ ${totalVendas.toFixed(2)}`;
        totalPedidosEl.textContent = totalPedidos;
        ticketMedioEl.textContent = `R$ ${ticketMedio.toFixed(2)}`;

        itensMaisVendidosListaEl.innerHTML = '';
        if (itensMaisVendidos.length > 0) {
            itensMaisVendidos.forEach(([nome, qtd]) => {
                const li = document.createElement('li');
                li.innerHTML = `<strong>${nome}</strong> - ${qtd} unidades vendidas`;
                itensMaisVendidosListaEl.appendChild(li);
            });
        } else {
            itensMaisVendidosListaEl.innerHTML = '<li>Nenhum item vendido ainda.</li>';
        }

    } catch (error) {
        console.error("Erro ao gerar relatórios:", error);
        document.getElementById('relatorios-container').innerHTML = '<p style="color: red;">Ocorreu um erro ao carregar os dados.</p>';
    } finally {
        loadingIndicator.style.display = 'none';
    }
}

// --- 4. INICIALIZAÇÃO DA PÁGINA ---

/**
 * Função principal que verifica a autenticação e inicia a geração dos relatórios.
 */
async function init() {
    onAuthChange(async (user) => {
        if (user) {
            const role = await getUserRole(user.uid);
            if (role === 'restaurante') {
                const q = query(collection(db, "restaurantes"), where("donoId", "==", user.uid));
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    const restauranteId = querySnapshot.docs[0].id;
                    gerarRelatorios(restauranteId);
                } else {
                    console.error("Usuário restaurante sem restaurante associado.");
                }
            } else {
                // Redireciona se não for um restaurante
                window.location.href = '/paginas/login.html';
            }
        } else {
            // Redireciona se não estiver logado
            window.location.href = '/paginas/login.html';
        }
    });
}

document.addEventListener('DOMContentLoaded', init);

