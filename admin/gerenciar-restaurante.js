/* E-Pra-Já v5: Script da Página de Gerenciamento de Restaurante (admin.js) */
/* Localização: /admin/gerenciar-restaurante.js */

// --- 1. IMPORTAÇÕES ---
import { db } from '../js/firebase-config.js';
import { onAuthChange, getUserRole, logoutUser } from '../js/services/auth.js';
import { getRestauranteById, criarRestaurantePeloAdmin, atualizarRestaurantePeloAdmin } from '../js/services/firestore.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {

    // --- 2. ELEMENTOS DO DOM ---
    const pageTitle = document.getElementById('page-title');
    const form = document.getElementById('form-gerenciar-restaurante');
    const messageContainer = document.getElementById('message-container');
    const restauranteIdInput = document.getElementById('restauranteId');
    const donoIdInput = document.getElementById('donoId');
    const uidInput = document.getElementById('uid-dono');
    const emailInput = document.getElementById('email-dono');
    const btnLogout = document.getElementById('btn-logout');
    // Elementos para o menu responsivo
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.getElementById('menu-toggle');
    const overlay = document.getElementById('overlay');

    // --- 3. LÓGICA DO MENU RESPONSIVO ---
    const toggleMenu = () => {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('visible');
    };
    if (menuToggle) menuToggle.addEventListener('click', toggleMenu);
    if (overlay) overlay.addEventListener('click', toggleMenu);

    // --- 4. FUNÇÕES AUXILIARES ---
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

    // --- 5. LÓGICA DE CARREGAMENTO (MODO EDIÇÃO) ---
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
            uidInput.closest('.form-group').style.display = 'none'; // Esconde o campo de UID no modo de edição

        } catch (error) {
            showMessage(`Erro ao carregar dados: ${error.message}`, true);
        }
    }

    // --- 6. LÓGICA DE SALVAMENTO (CRIAR/EDITAR) ---
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
                showMessage('Documentos do restaurante criados com sucesso! Lembre-se de criar o login para este usuário no painel do Firebase Auth.', false);
            }
            
            setTimeout(() => { window.location.href = 'index.html'; }, 3000);

        } catch (error) {
            showMessage(`Erro ao salvar: ${error.message}`, true);
        }
    });

    // --- 7. INICIALIZAÇÃO DA PÁGINA ---
    const inicializarPagina = () => {
        onAuthChange(async (user) => {
            if (user && await getUserRole(user.uid) === 'gestor') {
                const params = new URLSearchParams(window.location.search);
                const id = params.get('id');
                if (id) {
                    carregarDadosRestaurante(id);
                } else {
                    pageTitle.textContent = 'Criar Novo Restaurante';
                }
            } else {
                window.location.href = '/paginas/login.html';
            }
        });
    };

    if (btnLogout) btnLogout.addEventListener('click', () => { logoutUser(); window.location.href = '/paginas/login.html'; });
    
    inicializarPagina();
});

