/* E-Pra-Já v4: Script da Página de Gerenciamento de Restaurante (admin.js) */
/* Localização: /admin/gerenciar-restaurante.js */

// --- 1. IMPORTAÇÕES ---
import { db } from '../js/firebase-config.js';
import { onAuthChange, getUserRole } from '../js/services/auth.js';
import { getRestauranteById, criarRestaurantePeloAdmin, atualizarRestaurantePeloAdmin } from '../js/services/firestore.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {

    // --- 2. ELEMENTOS DO DOM ---
    const pageTitle = document.getElementById('page-title');
    const form = document.getElementById('form-gerenciar-restaurante');
    const messageContainer = document.getElementById('message-container');
    const restauranteIdInput = document.getElementById('restauranteId');
    const donoIdInput = document.getElementById('donoId');
    const uidInput = document.getElementById('uid-dono'); // Novo campo para UID
    const emailInput = document.getElementById('email-dono');
    const btnLogout = document.getElementById('btn-logout');

    // --- 3. FUNÇÕES AUXILIARES ---
    const showMessage = (message, isError = false) => {
        messageContainer.textContent = message;
        messageContainer.style.display = 'block';
        messageContainer.className = isError ? 'message error' : 'message success';
    };

    const timestampToDateInput = (timestamp) => {
        if (!timestamp) return '';
        const date = timestamp.toDate();
        return date.toISOString().split('T')[0]; // Formato YYYY-MM-DD
    };

    // --- 4. LÓGICA DE CARREGAMENTO (MODO EDIÇÃO) ---
    async function carregarDadosRestaurante(id) {
        try {
            const restaurante = await getRestauranteById(id);
            if (!restaurante) throw new Error('Restaurante não encontrado.');
            
            pageTitle.textContent = `Editando: ${restaurante.nome}`;
            
            restauranteIdInput.value = id;
            donoIdInput.value = restaurante.donoId || '';
            form['nome-restaurante'].value = restaurante.nome || '';
            form.endereco.value = restaurante.enderecoCompleto || '';
            form.status.value = restaurante.status || 'ativo';
            form.accessValidUntil.value = timestampToDateInput(restaurante.accessValidUntil);
            form.cnpj.value = restaurante.cnpj || '';
            form['nome-empresa'].value = restaurante.nomeEmpresa || '';

            if (restaurante.donoId) {
                const userDoc = await getDoc(doc(db, "utilizadores", restaurante.donoId));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    form['nome-dono'].value = userData.nome || '';
                    form.cpf.value = userData.cpf || '';
                    emailInput.value = userData.email || '';
                    emailInput.readOnly = true;
                }
            }
            // Oculta o campo de UID no modo de edição
            uidInput.closest('.form-group').style.display = 'none';

        } catch (error) {
            showMessage(`Erro ao carregar dados: ${error.message}`, true);
        }
    }

    // --- 5. LÓGICA DE SALVAMENTO (CRIAR/EDITAR) ---
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = restauranteIdInput.value;

        const dadosRestaurante = {
            nome: form['nome-restaurante'].value,
            enderecoCompleto: form.endereco.value,
            status: form.status.value,
            accessValidUntil: new Date(form.accessValidUntil.value),
            cnpj: form.cnpj.value,
            nomeEmpresa: form['nome-empresa'].value,
        };
        
        const dadosUsuario = {
            nome: form['nome-dono'].value,
            cpf: form.cpf.value,
            email: emailInput.value,
        };

        try {
            if (id) { // Editando
                await atualizarRestaurantePeloAdmin(id, donoIdInput.value, dadosRestaurante, dadosUsuario);
                showMessage('Restaurante atualizado com sucesso!', false);
            } else { // Criando
                const uid = uidInput.value;
                if (!uid) {
                    showMessage('O UID do usuário do Firebase Auth é obrigatório.', true);
                    return;
                }
                await criarRestaurantePeloAdmin(uid, dadosRestaurante, dadosUsuario);
                showMessage('Documentos do restaurante criados com sucesso!', false);
            }
            
            setTimeout(() => { window.location.href = 'index.html'; }, 2000);

        } catch (error) {
            showMessage(`Erro ao salvar: ${error.message}`, true);
        }
    });

    // --- 6. INICIALIZAÇÃO DA PÁGINA ---
    const inicializarPagina = () => {
        onAuthChange(async (user) => {
            if (user && await getUserRole(user.uid) === 'gestor') {
                const params = new URLSearchParams(window.location.search);
                const id = params.get('id');
                if (id) {
                    carregarDadosRestaurante(id);
                } else {
                    pageTitle.textContent = 'Criar Novo Restaurante';
                    alert("LEMBRETE: Para criar um novo restaurante, primeiro crie o usuário de login no painel do Firebase Authentication e copie o UID gerado aqui.");
                }
            } else {
                window.location.href = '/paginas/login.html';
            }
        });
    };

    if (btnLogout) btnLogout.addEventListener('click', () => { logoutUser(); window.location.href = '/paginas/login.html'; });
    
    inicializarPagina();
});

