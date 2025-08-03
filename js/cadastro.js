/* E-Pra-Já v4: Script da Página de Cadastro de Restaurante (cadastro.js) */
/* Localização: /js/cadastro.js */

// --- 1. IMPORTAÇÕES (CORRIGIDAS) ---
import { auth, db } from '../firebase-config.js';
// Importa as funções corretas do nosso serviço de autenticação
import { registerUser, loginUser } from './services/auth.js';
// As importações agora usam os links CDN completos
import { doc, setDoc, collection, Timestamp, query, where, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

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
    const whatsappInput = document.getElementById('whatsapp');
    const cepInput = document.getElementById('cep');
    const logradouroInput = document.getElementById('logradouro');
    const bairroInput = document.getElementById('bairro');
    const cidadeInput = document.getElementById('cidade');
    const ufInput = document.getElementById('uf');
    const numeroInput = document.getElementById('numero');
    
    // --- 3. FUNÇÃO DE EXIBIR MENSAGEM (COMPLETA) ---
    const showMessage = (message, isError = false) => {
        messageContainer.textContent = message;
        messageContainer.style.display = 'block';
        messageContainer.className = isError ? 'message error' : 'message success';
    };
    
    // --- 4. FUNÇÕES DE MÁSCARA E VALIDAÇÃO ---
    const applyMask = (input, maskFunc) => input.addEventListener('input', e => e.target.value = maskFunc(e.target.value));
    const maskCPF = v => v.replace(/\D/g, '').slice(0, 11).replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    const maskCNPJ = v => v.replace(/\D/g, '').slice(0, 14).replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1/$2').replace(/(\d{4})(\d{1,2})$/, '$1-$2');
    const maskWhatsApp = v => v.replace(/\D/g, '').slice(0, 11).replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2').replace(/(-\d{4})\d+?$/, '$1');
    const maskCEP = v => v.replace(/\D/g, '').slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2');
    
    applyMask(cpfInput, maskCPF);
    applyMask(cnpjInput, maskCNPJ);
    applyMask(whatsappInput, maskWhatsApp);
    applyMask(cepInput, maskCEP);
    
    // --- 5. LÓGICA DA API DE CEP ---
    cepInput.addEventListener('blur', async (e) => {
        const cep = e.target.value.replace(/\D/g, '');
        if (cep.length !== 8) return;
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            const data = await response.json();
            if (!data.erro) {
                logradouroInput.value = data.logradouro;
                bairroInput.value = data.bairro;
                cidadeInput.value = data.localidade;
                ufInput.value = data.uf;
                numeroInput.focus();
            } else {
                showMessage('CEP não encontrado.', true);
            }
        } catch (error) {
            console.error("Erro ao buscar CEP:", error);
        }
    });
    
    // --- 6. LÓGICA CONDICIONAL DO FORMULÁRIO ---
    possuiCnpjRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const isSim = e.target.value === 'sim';
            cnpjSection.style.display = isSim ? 'block' : 'none';
            cnpjInput.required = isSim;
            cadastroForm['nome-empresa'].required = isSim;
        });
    });
    
    // --- 7. EVENT LISTENER DO FORMULÁRIO ---
    cadastroForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        submitBtn.disabled = true;
        submitBtn.textContent = 'Verificando dados...';
        
        const cpf = cpfInput.value;
        try {
            const q = query(collection(db, "utilizadores"), where("cpf", "==", cpf));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) throw new Error('Este CPF já está cadastrado no sistema.');
            
            submitBtn.textContent = 'Processando...';
            
            const email = cadastroForm.email.value;
            const password = cadastroForm.password.value;
            
            // Passo 1: Preparar os dados do usuário
            const dadosUsuario = {
                nome: cadastroForm['nome-responsavel'].value,
                cpf: cpf,
                whatsapp: whatsappInput.value,
                role: "restaurante",
                status: "ativo"
            };
            
            // Passo 2: Chamar a função de registro do serviço (ARQUITETURA CORRETA)
            const userCredential = await registerUser(email, password, dadosUsuario);
            const user = userCredential.user;
            
            // Passo 3: Preparar e salvar os dados do restaurante
            const trialEndDate = new Date();
            trialEndDate.setDate(trialEndDate.getDate() + 7);
            const enderecoCompleto = `${logradouroInput.value}, ${numeroInput.value}, ${cadastroForm.complemento.value} - ${bairroInput.value}, ${cidadeInput.value} - ${ufInput.value}`;
            const dadosRestaurante = {
                donoId: user.uid,
                nome: cadastroForm['nome-restaurante'].value,
                enderecoCompleto: enderecoCompleto,
                possuiCnpj: cadastroForm.possuiCnpj.value === 'sim',
                cnpj: cadastroForm.cnpj.value || null,
                nomeEmpresa: cadastroForm['nome-empresa'].value || null,
                accessValidUntil: Timestamp.fromDate(trialEndDate),
                status: "teste",
                statusPagamento: "pendente",
                solicitouDesbloqueio: false,
                info: { telefone: "", horarios: "", logoUrl: "" },
            };
            await setDoc(doc(db, "restaurantes", user.uid), dadosRestaurante);
            
            // Passo 4: Fazer o login automático
            await loginUser(email, password);
            
            showMessage('Conta criada com sucesso! Redirecionando para o seu painel...', false);
            setTimeout(() => { window.location.href = '/restaurante/'; }, 2000);
            
        } catch (error) {
            console.error("Erro no processo de cadastro:", error);
            let friendlyMessage = error.message;
            if (error.code === 'auth/email-already-in-use') {
                friendlyMessage = "Este endereço de e-mail já está sendo utilizado.";
            }
            showMessage(friendlyMessage, true);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Criar Conta e Iniciar Teste Grátis';
        }
    });
});