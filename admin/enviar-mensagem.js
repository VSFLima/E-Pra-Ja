/* E-Pra-Já v4: Script da Página de Envio de Mensagem (enviar-mensagem.js) */
/* Localização: /admin/enviar-mensagem.js */

// --- 1. IMPORTAÇÕES ---
import { onAuthChange, getUserRole, logoutUser } from '../js/services/auth.js';
// A função para enviar a mensagem que está no nosso serviço do Firestore
import { enviarMensagemGlobal } from '../js/services/firestore.js';

document.addEventListener('DOMContentLoaded', () => {

    // --- 2. ELEMENTOS DO DOM ---
    const form = document.getElementById('form-enviar-mensagem');
    if (!form) return;

    const messageContainer = document.getElementById('message-container');
    const submitBtn = form.querySelector('button[type="submit"]');
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

    // --- 4. FUNÇÃO DE EXIBIR MENSAGEM ---
    const showMessage = (message, isError = false) => {
        messageContainer.textContent = message;
        messageContainer.style.display = 'block';
        messageContainer.className = isError ? 'message error' : 'message success';
    };

    // --- 5. LÓGICA DE ENVIO ---
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        submitBtn.disabled = true;
        submitBtn.textContent = 'Enviando...';

        const grupoAlvo = form.querySelector('#grupo-alvo').value;
        const textoMensagem = form.querySelector('#texto-mensagem').value;

        try {
            if (!grupoAlvo || !textoMensagem.trim()) {
                throw new Error('Por favor, preencha todos os campos.');
            }

            await enviarMensagemGlobal(grupoAlvo, textoMensagem);

            showMessage('Mensagem enviada com sucesso para o grupo selecionado!', false);
            form.reset(); // Limpa o formulário após o envio

        } catch (error) {
            showMessage(`Erro ao enviar mensagem: ${error.message}`, true);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Enviar Mensagem';
        }
    });

    // --- 6. INICIALIZAÇÃO E SEGURANÇA DA PÁGINA ---
    const inicializarPagina = () => {
        onAuthChange(async (user) => {
            if (!user || await getUserRole(user.uid) !== 'gestor') {
                window.location.href = '/paginas/login.html';
            }
        });
    };

    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            logoutUser();
            window.location.href = '/paginas/login.html';
        });
    }

    inicializarPagina();
});

