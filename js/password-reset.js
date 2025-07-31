/* E-Pra-Já v2: Script da Página de Redefinição de Senha (password-reset.js) */
/* Localização: /js/password-reset.js */

// --- 1. IMPORTAÇÕES ---
// Importaremos uma nova função do nosso serviço de autenticação.
// Precisaremos editar o arquivo auth.js para adicionar esta função.
import { sendPasswordReset } from './services/auth.js';

// --- 2. ELEMENTOS DO DOM ---
const resetForm = document.getElementById('reset-form');
const emailInput = document.getElementById('email');
const submitBtn = document.getElementById('submit-btn');
const messageContainer = document.getElementById('message-container');

// --- 3. FUNÇÃO DE EXIBIR MENSAGEM ---
const showMessage = (message, isError = false) => {
    messageContainer.textContent = message;
    messageContainer.style.display = 'block';
    messageContainer.className = isError ? 'message error' : 'message success';
};

// --- 4. EVENT LISTENER DO FORMULÁRIO ---
resetForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Impede o recarregamento da página

    const email = emailInput.value;
    if (!email) {
        showMessage('Por favor, insira o seu endereço de e-mail.', true);
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando...';
    messageContainer.style.display = 'none';

    try {
        // Chama a função do serviço de autenticação
        await sendPasswordReset(email);
        
        // Exibe uma mensagem de sucesso
        showMessage('Se a sua conta existir, um e-mail de redefinição de senha foi enviado. Verifique a sua caixa de entrada e a pasta de spam.', false);
        
        // Limpa o campo e mantém o botão desativado para evitar múltiplos envios
        emailInput.value = '';

    } catch (error) {
        console.error("Erro ao enviar e-mail de redefinição:", error);
        
        // Mostra uma mensagem de erro genérica por segurança
        // Não informamos se o e-mail existe ou não na base de dados
        showMessage('Ocorreu um erro. Por favor, tente novamente mais tarde.', true);
        
        // Reativa o botão em caso de erro
        submitBtn.disabled = false;
        submitBtn.textContent = 'Enviar Link de Redefinição';
    }
});

