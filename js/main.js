/* E-Pra-Já v2: Script Principal (main.js) */
/* Localização: /js/main.js */

// --- 1. IMPORTAÇÕES ---
import { onAuthChange, getUserRole } from './services/auth.js';

// --- 2. ELEMENTOS DO DOM ---
const navActionButton = document.getElementById('nav-action-btn');

// --- 3. NOVA LÓGICA INTELIGENTE ---

/**
 * Atualiza o botão de navegação principal com base no status de login do usuário.
 * Em vez de redirecionar, ele altera o texto e o link do botão.
 */
const atualizarBotaoNavegacao = () => {
    if (!navActionButton) return;

    onAuthChange(async (user) => {
        if (user) {
            // Usuário está logado. Vamos descobrir seu perfil.
            try {
                const role = await getUserRole(user.uid);
                let destination = '/'; // Destino padrão

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
                    default:
                        // Se for um cliente ou perfil desconhecido, o link pode levar a uma página de perfil no futuro.
                        // Por enquanto, aponta para a raiz.
                        destination = '/';
                        break;
                }

                // Altera o botão para "Acessar Painel"
                navActionButton.textContent = 'Acessar Painel';
                navActionButton.href = destination;

            } catch (error) {
                console.error("Erro ao configurar o botão de navegação:", error);
                // Em caso de erro, mantém o botão como "Login"
                navActionButton.textContent = 'Login';
                navActionButton.href = 'paginas/login.html';
            }
        } else {
            // Usuário não está logado. Garante que o botão seja de "Login".
            navActionButton.textContent = 'Login';
            navActionButton.href = 'paginas/login.html';
        }
    });
};

// --- 4. EXECUÇÃO ---
document.addEventListener('DOMContentLoaded', atualizarBotaoNavegacao);

