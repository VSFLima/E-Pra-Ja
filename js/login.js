/* E-Pra-Já v2: Script da Página de Login (login.js) */
/* Localização: /js/login.js */

// --- 1. IMPORTAÇÕES ---
import { loginUser, getUserRole } from './services/auth.js';

// --- 2. ELEMENTOS DO DOM ---
const loginForm = document.getElementById('login-form');
const submitBtn = document.getElementById('submit-btn');
const messageContainer = document.getElementById('message-container');

// --- 3. FUNÇÃO DE EXIBIR MENSAGEM ---
const showMessage = (message, isError = false) => {
    messageContainer.textContent = message;
    messageContainer.style.display = 'block';
    messageContainer.className = isError ? 'message error' : 'message success';
};

// --- 4. EVENT LISTENER DO FORMULÁRIO ---
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    submitBtn.disabled = true;
    submitBtn.textContent = 'Entrando...';
    showMessage('Verificando suas credenciais...', false);

    const email = loginForm['email'].value;
    const password = loginForm['password'].value;

    try {
        const userCredential = await loginUser(email, password);
        const user = userCredential.user;
        const role = await getUserRole(user.uid);

        if (!role) {
            throw new Error('Não foi possível determinar seu perfil de acesso.');
        }

        showMessage('Login bem-sucedido! Redirecionando para seu painel...', false);

        // Os destinos para os painéis (admin, restaurante) estão na raiz, o que está correto.
        let destination = '/'; // Destino padrão para clientes
        switch (role) {
            case 'gestor':
                destination = '/admin/';
                break;
            case 'restaurante':
                destination = '/restaurante/';
                break;
            case 'entregador':
                destination = '/entregador/';
                break;
        }

        setTimeout(() => {
            window.location.href = destination;
        }, 1500);

    } catch (error) {
        console.error("Erro no processo de login:", error);
        
        let friendlyMessage = "E-mail ou senha incorretos. Tente novamente.";
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
            friendlyMessage = "E-mail ou senha incorretos. Verifique seus dados.";
        }
        
        showMessage(friendlyMessage, true);

        submitBtn.disabled = false;
        submitBtn.textContent = 'Entrar';
    }
});

