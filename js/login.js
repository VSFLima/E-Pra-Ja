/* E-Pra-Já v4: Script da Página de Login (login.js) */
/* Localização: /js/login.js */

// --- 1. IMPORTAÇÕES (CORRIGIDO) ---
// Agora importa as funções de serviço que criamos em auth.js
import { loginUser, getUserRole } from './services/auth.js';

document.addEventListener('DOMContentLoaded', () => {

    // --- 2. ELEMENTOS DO DOM ---
    const loginForm = document.getElementById('login-form');
    if (!loginForm) return;

    const submitBtn = document.getElementById('submit-btn');
    const messageContainer = document.getElementById('message-container');

    // --- 3. FUNÇÃO DE EXIBIR MENSAGEM ---
    const showMessage = (message, isError = false) => {
        messageContainer.textContent = message;
        messageContainer.style.display = 'block';
        messageContainer.className = isError ? 'message error' : 'message success';
    };

    // --- 4. EVENT LISTENER DO FORMULÁRIO (CORRIGIDO) ---
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        submitBtn.disabled = true;
        submitBtn.textContent = 'Entrando...';
        showMessage('Verificando suas credenciais...', false);

        const email = loginForm['email'].value;
        const password = loginForm['password'].value;

        try {
            // Passo 1: Tentar fazer o login usando a função do nosso serviço (AGORA FUNCIONAL)
            const userCredential = await loginUser(email, password);
            const user = userCredential.user;

            // Passo 2: Obter o perfil (role) do usuário no Firestore
            const role = await getUserRole(user.uid);

            if (!role) {
                throw new Error('Não foi possível determinar seu perfil de acesso.');
            }

            showMessage('Login bem-sucedido! Redirecionando para seu painel...', false);

            // Passo 3: Redirecionar com base no perfil
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
});

