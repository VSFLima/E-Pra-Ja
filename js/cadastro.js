/* E-Pra-Já v4: Script da Página de Cadastro de Restaurante (cadastro.js) */
/* Localização: /js/cadastro.js */

// --- 1. IMPORTAÇÕES ---
import { auth, db } from '../firebase-config.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { doc, setDoc, collection, Timestamp, writeBatch, query, where, getDocs } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {

    // --- 2. ELEMENTOS DO DOM ---
    const cadastroForm = document.getElementById('cadastro-form');
    if (!cadastroForm) return;

    const submitBtn = document.getElementById('submit-btn');
    const messageContainer = document.getElementById('message-container');
    const possuiCnpjRadios = document.querySelectorAll('input[name="possuiCnpj"]');
    const cnpjSection = document.getElementById('cnpj-section');
    const cpfInput = document.getElementById('cpf');
    const cnpjInput = document.getElementById('cnpj');
    const nomeEmpresaInput = document.getElementById('nome-empresa');

    // --- 3. FUNÇÕES DE VALIDAÇÃO E MÁSCARA ---
    // (As funções de máscara e validação de formato estão mantidas e corretas)
    const applyMask = (input, maskFunction) => { /* ... */ };
    const maskCPF = (value) => { /* ... */ };
    const maskCNPJ = (value) => { /* ... */ };
    applyMask(cpfInput, maskCPF);
    applyMask(cnpjInput, maskCNPJ);
    const validateCPF = (cpf) => /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(cpf);
    const validateCNPJ = (cnpj) => /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(cnpj);

    // --- 4. FUNÇÃO DE EXIBIR MENSAGEM ---
    const showMessage = (message, isError = false) => { /* ... (código mantido) ... */ };

    // --- 5. LÓGICA CONDICIONAL DO FORMULÁRIO ---
    possuiCnpjRadios.forEach(radio => { /* ... (código mantido) ... */ });

    // --- 6. EVENT LISTENER DO FORMULÁRIO (COM VALIDAÇÃO DE DUPLICIDADE) ---
    cadastroForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        submitBtn.disabled = true;
        submitBtn.textContent = 'Verificando dados...';

        const cpf = cadastroForm['cpf'].value;
        const possuiCnpj = cadastroForm['possuiCnpj'].value === 'sim';
        const cnpj = cadastroForm['cnpj'].value;

        // Validação de formato
        if (!validateCPF(cpf)) {
            showMessage('Por favor, insira um CPF válido.', true);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Criar Conta e Iniciar Teste Grátis';
            return;
        }
        if (possuiCnpj && !validateCNPJ(cnpj)) {
            showMessage('Por favor, insira um CNPJ válido.', true);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Criar Conta e Iniciar Teste Grátis';
            return;
        }

        try {
            // (NOVO E CRÍTICO) Passo 1: Verificar se o CPF já existe
            const q = query(collection(db, "utilizadores"), where("cpf", "==", cpf));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                throw new Error('Este CPF já está cadastrado no sistema.');
            }

            submitBtn.textContent = 'Processando...';

            const nomeResponsavel = cadastroForm['nome-responsavel'].value;
            const nomeRestaurante = cadastroForm['nome-restaurante'].value;
            const endereco = cadastroForm['endereco'].value;
            const email = cadastroForm['email'].value;
            const password = cadastroForm['password'].value;

            // Passo 2: Criar o usuário no Auth
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Passo 3: Preparar os dados para o Firestore
            const dadosUsuario = {
                email: user.email, nome: nomeResponsavel, cpf: cpf,
                role: "restaurante", status: "ativo"
            };
            const trialEndDate = new Date();
            trialEndDate.setDate(trialEndDate.getDate() + 7);
            const dadosRestaurante = {
                donoId: user.uid, nome: nomeRestaurante, enderecoCompleto: endereco,
                possuiCnpj: possuiCnpj,
                cnpj: possuiCnpj ? cnpj : null,
                nomeEmpresa: possuiCnpj ? cadastroForm['nome-empresa'].value : null,
                accessValidUntil: Timestamp.fromDate(trialEndDate),
                status: "teste", statusPagamento: "pendente", solicitouDesbloqueio: false,
                info: { telefone: "", horarios: "", logoUrl: "" },
            };

            // Passo 4: Salvar os dados no Firestore
            const batch = writeBatch(db);
            batch.set(doc(db, "utilizadores", user.uid), dadosUsuario);
            batch.set(doc(db, "restaurantes", user.uid), dadosRestaurante);
            await batch.commit();
            
            // Passo 5: Fazer o login automático
            await signInWithEmailAndPassword(auth, email, password);
            
            showMessage('Conta criada com sucesso! Redirecionando para o seu painel...', false);

            // Passo 6: Redirecionar para o painel
            setTimeout(() => { window.location.href = '/restaurante/'; }, 2000);

        } catch (error) {
            console.error("Erro no processo de cadastro:", error);
            let friendlyMessage = error.message; // Usa a mensagem de erro específica por padrão
            if (error.code === 'auth/email-already-in-use') {
                friendlyMessage = "Este endereço de e-mail já está sendo utilizado.";
            }
            showMessage(friendlyMessage, true);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Criar Conta e Iniciar Teste Grátis';
        }
    });
});

