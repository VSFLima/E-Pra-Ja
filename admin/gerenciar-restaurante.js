/* E-Pra-Já v4: Script da Página de Gerenciamento de Restaurante (gerenciar-restaurante.js) */
/* Localização: /admin/gerenciar-restaurante.js */

// --- 1. IMPORTAÇÕES ---
import { db } from '../js/firebase-config.js';
import { onAuthChange, getUserRole } from '../js/services/auth.js';
// Novas funções que precisaremos adicionar ao firestore.js
import { getRestauranteById, criarRestaurantePeloAdmin, atualizarRestaurantePeloAdmin } from '../js/services/firestore.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- 2. ELEMENTOS DO DOM ---
const pageTitle = document.getElementById('page-title');
const form = document.getElementById('form-gerenciar-restaurante');
const messageContainer = document.getElementById('message-container');
const restauranteIdInput = document.getElementById('restauranteId');
const donoIdInput = document.getElementById('donoId');

// --- 3. FUNÇÕES AUXILIARES ---
const showMessage = (message, isError = false) => {
    messageContainer.textContent = message;
    messageContainer.style.display = 'block';
    messageContainer.className = isError ? 'message error' : 'message success';
};

// Converte um Timestamp do Firebase para o formato YYYY-MM-DD para o input de data
const timestampToDateInput = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// --- 4. LÓGICA DE CARREGAMENTO E EDIÇÃO ---

/**
 * Carrega os dados de um restaurante existente no formulário para edição.
 * @param {string} id - O ID do restaurante a ser carregado.
 */
async function carregarDadosRestaurante(id) {
    try {
        const restaurante = await getRestauranteById(id);
        if (restaurante) {
            pageTitle.textContent = `Editando: ${restaurante.nome}`;
            
            // Preenche os campos do formulário
            restauranteIdInput.value = id;
            donoIdInput.value = restaurante.donoId || '';
            form.querySelector('#nome-restaurante').value = restaurante.nome || '';
            form.querySelector('#endereco').value = restaurante.enderecoCompleto || '';
            form.querySelector('#status').value = restaurante.status || 'ativo';
            form.querySelector('#accessValidUntil').value = timestampToDateInput(restaurante.accessValidUntil);

            // Carrega dados do usuário associado (dono)
            if (restaurante.donoId) {
                const userDoc = await getDoc(doc(db, "utilizadores", restaurante.donoId));
                if (userDoc.exists()) {
                    form.querySelector('#cpf').value = userDoc.data().cpf || '';
                }
            }
            
            // Preenche dados fiscais
            form.querySelector('#cnpj').value = restaurante.cnpj || '';
            form.querySelector('#nome-empresa').value = restaurante.nomeEmpresa || '';

        } else {
            throw new Error('Restaurante não encontrado.');
        }
    } catch (error) {
        showMessage(`Erro ao carregar dados: ${error.message}`, true);
    }
}

// --- 5. LÓGICA DE SALVAMENTO ---
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = restauranteIdInput.value;

    const dadosRestaurante = {
        nome: form.querySelector('#nome-restaurante').value,
        enderecoCompleto: form.querySelector('#endereco').value,
        status: form.querySelector('#status').value,
        accessValidUntil: new Date(form.querySelector('#accessValidUntil').value),
        cnpj: form.querySelector('#cnpj').value,
        nomeEmpresa: form.querySelector('#nome-empresa').value,
    };
    
    // Dados do usuário (apenas CPF por enquanto)
    const dadosUsuario = {
        cpf: form.querySelector('#cpf').value,
    };

    try {
        if (id) { // Editando
            await atualizarRestaurantePeloAdmin(id, donoIdInput.value, dadosRestaurante, dadosUsuario);
            showMessage('Restaurante atualizado com sucesso!', false);
        } else { // Criando
            // A função de criar restaurante pelo admin precisará ser robusta,
            // criando o usuário no Auth e os documentos no Firestore.
            // Por agora, simulamos a chamada.
            await criarRestaurantePeloAdmin(dadosRestaurante, dadosUsuario);
            showMessage('Restaurante criado com sucesso! Lembre-se de criar o login para o dono.', false);
        }
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);

    } catch (error) {
        showMessage(`Erro ao salvar: ${error.message}`, true);
    }
});

// --- 6. INICIALIZAÇÃO DA PÁGINA ---
document.addEventListener('DOMContentLoaded', () => {
    onAuthChange(async (user) => {
        if (user) {
            const role = await getUserRole(user.uid);
            if (role !== 'gestor') {
                window.location.href = '/paginas/login.html';
                return;
            }
            
            const params = new URLSearchParams(window.location.search);
            const id = params.get('id');
            if (id) {
                // Modo de Edição
                carregarDadosRestaurante(id);
            } else {
                // Modo de Criação
                pageTitle.textContent = 'Criar Novo Restaurante';
            }
        } else {
            window.location.href = '/paginas/login.html';
        }
    });
});

