/* E-Pra-Já v4: Script da Página de Cadastro de Restaurante (cadastro.js) */
/* Localização: /js/cadastro.js */

// --- 1. IMPORTAÇÕES ---
import { auth, db } from '../firebase-config.js';
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { doc, setDoc, collection, Timestamp, writeBatch } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- 2. ELEMENTOS DO DOM ---
const cadastroForm = document.getElementById('cadastro-form');
const submitBtn = document.getElementById('submit-btn');
const messageContainer = document.getElementById('message-container');
const possuiCnpjRadios = document.querySelectorAll('input[name="possuiCnpj"]');
const cnpjSection = document.getElementById('cnpj-section');
const cnpjInput = document.getElementById('cnpj');
const nomeEmpresaInput = document.getElementById('nome-empresa');

// --- 3. FUNÇÃO DE EXIBIR MENSAGEM ---
const showMessage = (message, isError = false) => {
    messageContainer.textContent = message;
    messageContainer.style.display = 'block';
    messageContainer.className = isError ? 'message error' : 'message success';
};

// --- 4. LÓGICA CONDICIONAL DO FORMULÁRIO ---
possuiCnpjRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        if (e.target.value === 'sim') {
            cnpjSection.style.display = 'block';
            cnpjInput.required = true;
            nomeEmpresaInput.required = true;
        } else {
            cnpjSection.style.display = 'none';
            cnpjInput.required = false;
            nomeEmpresaInput.required = false;
        }
    });
});

// --- 5. EVENT LISTENER DO FORMULÁRIO ---
cadastroForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    submitBtn.textContent = 'Processando...';

    // Coleta de dados do formulário
    const nomeResponsavel = cadastroForm['nome-responsavel'].value;
    const cpf = cadastroForm['cpf'].value;
    const nomeRestaurante = cadastroForm['nome-restaurante'].value;
    const endereco = cadastroForm['endereco'].value;
    const possuiCnpj = cadastroForm['possuiCnpj'].value === 'sim';
    const email = cadastroForm['email'].value;
    const password = cadastroForm['password'].value;

    try {
        // Passo 1: Criar o usuário no Firebase Authentication
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Passo 2: Preparar os dados para o Firestore
        const dadosUsuario = {
            email: user.email,
            nome: nomeResponsavel,
            cpf: cpf,
            role: "restaurante",
            status: "ativo" // Novo usuário começa ativo
        };

        // Calcula a data de término do período de teste (7 dias a partir de agora)
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 7);

        const dadosRestaurante = {
            donoId: user.uid,
            nome: nomeRestaurante,
            enderecoCompleto: endereco,
            possuiCnpj: possuiCnpj,
            cnpj: possuiCnpj ? cadastroForm['cnpj'].value : null,
            nomeEmpresa: possuiCnpj ? cadastroForm['nome-empresa'].value : null,
            accessValidUntil: Timestamp.fromDate(trialEndDate), // Novo campo chave
            status: "teste", // Começa em período de teste
            statusPagamento: "pendente", // Pagamento fica pendente após o teste
            solicitouDesbloqueio: false,
            info: { telefone: "", horarios: "", logoUrl: "" },
        };

        // Passo 3: Salvar os dados no Firestore em um batch (operação atômica)
        const batch = writeBatch(db);
        
        const userDocRef = doc(db, "utilizadores", user.uid);
        batch.set(userDocRef, dadosUsuario);

        // O nome do documento do restaurante será o mesmo UID do dono para facilitar a busca
        const restauranteDocRef = doc(db, "restaurantes", user.uid);
        batch.set(restauranteDocRef, dadosRestaurante);

        await batch.commit();
        
        showMessage('Conta criada com sucesso! Você tem 7 dias de teste grátis. Redirecionando para o login...', false);

        setTimeout(() => {
            window.location.href = 'login.html';
        }, 4000);

    } catch (error) {
        console.error("Erro no processo de cadastro:", error);
        let friendlyMessage = "Ocorreu um erro. Tente novamente.";
        if (error.code === 'auth/email-already-in-use') {
            friendlyMessage = "Este endereço de e-mail já está sendo utilizado.";
        }
        showMessage(friendlyMessage, true);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Criar Conta e Iniciar Teste Grátis';
    }
});

