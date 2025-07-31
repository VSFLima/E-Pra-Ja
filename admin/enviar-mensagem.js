/* E-Pra-Já v4: Script da Página de Envio de Mensagem (enviar-mensagem.js) */
/* Localização: /admin/enviar-mensagem.js */

// --- 1. IMPORTAÇÕES ---
import { db } from '../js/firebase-config.js';
import { onAuthChange, getUserRole } from '../js/services/auth.js';
// Novas funções que precisaremos adicionar ao firestore.js
import { enviarMensagemGlobal } from '../js/services/firestore.js';

// --- 2. ELEMENTOS DO DOM ---
const form = document.getElementById('form-enviar-mensagem');
const messageContainer = document.getElementById('message-container');
const submitBtn = form.querySelector('button[type="submit"]');

// --- 3. FUNÇÕES AUXILIARES ---
const showMessage = (message, isError = false) => {
    messageContainer.textContent = message;
    messageContainer.style.display = 'block';
    messageContainer.className = isError ? 'message error' : 'message success';
};

// --- 4. LÓGICA DE ENVIO ---
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando...';

    const grupoAlvo = form.querySelector('#grupo-alvo').value;
    const textoMensagem = form.querySelector('#texto-mensagem').value;

    try {
        if (!grupoAlvo || !textoMensagem) {
            throw new Error('Por favor, preencha todos os campos.');
        }

        // Chama a nova função do nosso serviço do Firestore
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

// --- 5. INICIALIZAÇÃO DA PÁGINA ---
document.addEventListener('DOMContentLoaded', () => {
    // Protege a página para garantir que apenas o gestor possa acessá-la
    onAuthChange(async (user) => {
        if (user) {
            const role = await getUserRole(user.uid);
            if (role !== 'gestor') {
                // Se não for gestor, redireciona para a página de login
                window.location.href = '/paginas/login.html';
            }
        } else {
            // Se não estiver logado, redireciona para a página de login
            window.location.href = '/paginas/login.html';
        }
    });
});

