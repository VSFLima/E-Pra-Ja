/* E-Pra-Já v3: Script do Painel do Gestor (admin.js) */
/* Localização: /admin/admin.js */

// --- 1. IMPORTAÇÕES ---
import { db } from '../js/firebase-config.js';
import { onAuthChange, getUserRole, logoutUser } from '../js/services/auth.js';
import { getTodosRestaurantes, getTodosUtilizadores } from '../js/services/firestore.js';
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- 2. ELEMENTOS DO DOM ---
const nomeUtilizadorEl = document.getElementById('nome-utilizador');
const btnLogout = document.getElementById('btn-logout');
const totalRestaurantesEl = document.getElementById('total-restaurantes');
const totalUtilizadoresEl = document.getElementById('total-utilizadores');
const listaRestaurantesEl = document.getElementById('lista-restaurantes-body');
const listaUtilizadoresEl = document.getElementById('lista-utilizadores-body');
const relatorioIndicacoesBody = document.getElementById('relatorio-indicacoes-body');

// --- 3. FUNÇÕES DE RENDERIZAÇÃO ---

/**
 * Carrega e exibe as métricas principais do dashboard em tempo real.
 */
const carregarMetricas = () => {
    onSnapshot(collection(db, "restaurantes"), (snapshot) => {
        if (totalRestaurantesEl) totalRestaurantesEl.textContent = snapshot.size;
    });
    onSnapshot(collection(db, "utilizadores"), (snapshot) => {
        if (totalUtilizadoresEl) totalUtilizadoresEl.textContent = snapshot.size;
    });
};

/**
 * Carrega e exibe a lista de todos os restaurantes e o relatório de indicações.
 */
const carregarRestaurantesEIndicacoes = async () => {
    if (!listaRestaurantesEl || !relatorioIndicacoesBody) return;
  
    try {
        const restaurantes = await getTodosRestaurantes();
        listaRestaurantesEl.innerHTML = ''; 
        relatorioIndicacoesBody.innerHTML = '';

        if (restaurantes.length === 0) {
            const msg = '<tr><td colspan="4">Nenhum restaurante cadastrado.</td></tr>';
            listaRestaurantesEl.innerHTML = msg;
            relatorioIndicacoesBody.innerHTML = '<tr><td colspan="3">Nenhuma indicação registrada.</td></tr>';
            return;
        }

        const restauranteMap = new Map(restaurantes.map(r => [r.id, r.nome]));

        restaurantes.forEach(rest => {
            const trRestaurante = document.createElement('tr');
            trRestaurante.innerHTML = `
                <td>${rest.nome || 'Nome não definido'}</td>
                <td>${rest.donoId}</td>
                <td>${rest.indicadosConfirmados || 0}</td>
                <td><button class="btn btn-sm">Gerenciar</button></td>
            `;
            listaRestaurantesEl.appendChild(trRestaurante);

            if (rest.indicadoPor) {
                const trIndicacao = document.createElement('tr');
                const nomeIndicador = restauranteMap.get(rest.indicadoPor) || 'ID não encontrado';
                trIndicacao.innerHTML = `
                    <td>${rest.nome}</td>
                    <td>${nomeIndicador} (ID: ${rest.indicadoPor})</td>
                    <td><button class="btn btn-sm">Confirmar Benefício</button></td>
                `;
                relatorioIndicacoesBody.appendChild(trIndicacao);
            }
        });
        
        if (relatorioIndicacoesBody.innerHTML === '') {
             relatorioIndicacoesBody.innerHTML = '<tr><td colspan="3">Nenhuma indicação registrada.</td></tr>';
        }

    } catch (error) {
        console.error("Erro ao carregar restaurantes:", error);
        listaRestaurantesEl.innerHTML = '<tr><td colspan="4">Erro ao carregar dados.</td></tr>';
    }
};

/**
 * Carrega e exibe a lista de todos os utilizadores na tabela.
 */
const carregarUtilizadores = async () => {
    if (!listaUtilizadoresEl) return;
  
    try {
        const utilizadores = await getTodosUtilizadores();
        listaUtilizadoresEl.innerHTML = '';

        if (utilizadores.length === 0) {
            listaUtilizadoresEl.innerHTML = '<tr><td colspan="4">Nenhum usuário cadastrado.</td></tr>';
            return;
        }

        utilizadores.forEach(user => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${user.email}</td>
                <td>${user.nome || 'Não informado'}</td>
                <td><span class="status ${user.role}">${user.role}</span></td>
                <td><button class="btn btn-sm">Gerenciar</button></td>
            `;
            listaUtilizadoresEl.appendChild(tr);
        });
    } catch (error) {
        console.error("Erro ao carregar usuários:", error);
        listaUtilizadoresEl.innerHTML = '<tr><td colspan="4">Erro ao carregar dados.</td></tr>';
    }
};

// --- 4. FUNÇÃO PRINCIPAL E CONTROLE DE ACESSO ---
const inicializarPainelAdmin = () => {
    onAuthChange(async (user) => {
        if (user) {
            try {
                const role = await getUserRole(user.uid);
                if (role === 'gestor') {
                    if (nomeUtilizadorEl) nomeUtilizadorEl.textContent = user.email;
                    
                    // Carrega todos os dados do painel
                    carregarMetricas();
                    carregarRestaurantesEIndicacoes();
                    carregarUtilizadores(); // <-- Agora está sendo chamado corretamente
                } else {
                    window.location.href = '/paginas/login.html';
                }
            } catch (error) {
                window.location.href = '/paginas/login.html';
            }
        } else {
            window.location.href = '/paginas/login.html';
        }
    });
};

// --- 5. EVENT LISTENERS ---
if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
        await logoutUser();
        window.location.href = '/paginas/login.html';
    });
}

// --- 6. EXECUÇÃO ---
document.addEventListener('DOMContentLoaded', inicializarPainelAdmin);

