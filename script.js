document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('modal-aluno');
    const modalSucesso = document.getElementById('modal-sucesso');
    const btnNovoAluno = document.getElementById('btn-novo-aluno');
    const btnCancelar = document.getElementById('btn-cancelar');
    const spanClose = document.querySelector('.close');
    const spanCloseSucesso = document.querySelector('.close-sucesso');
    const btnOkSucesso = document.getElementById('btn-ok-sucesso');
    const formAluno = document.getElementById('form-aluno');
    const corpoTabela = document.getElementById('corpo-tabela');
    const modalTitulo = document.getElementById('modal-titulo');
    const detalhesSucesso = document.getElementById('detalhes-sucesso');

    let alunos = JSON.parse(localStorage.getItem('alunos')) || [];
    let editandoId = null;

    // --- MÁSCARAS ---
    const mascaraCPF = (v) => {
        v = v.replace(/\D/g, "");
        if (v.length > 11) v = v.slice(0, 11);
        v = v.replace(/(\d{3})(\d)/, "$1.$2");
        v = v.replace(/(\d{3})(\d)/, "$1.$2");
        v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
        return v;
    };

    const mascaraRG = (v) => {
        v = v.toUpperCase().replace(/[^0-9X]/g, "");
        if (v.length > 9) v = v.slice(0, 9);
        v = v.replace(/(\d{2})(\d)/, "$1.$2");
        v = v.replace(/(\d{3})(\d)/, "$1.$2");
        v = v.replace(/(\d{3})([0-9X]{1})$/, "$1-$2");
        return v;
    };

    const mascaraTel = (v) => {
        v = v.replace(/\D/g, "");
        if (v.length > 11) v = v.slice(0, 11);
        v = v.replace(/^(\d{2})(\d)/g, "($1) $2");
        v = v.replace(/(\d{5})(\d)/, "$1-$2");
        return v;
    };

    const mascaraCEP = (v) => {
        v = v.replace(/\D/g, "");
        if (v.length > 8) v = v.slice(0, 8);
        v = v.replace(/(\d{5})(\d)/, "$1-$2");
        return v;
    };

    document.getElementById('cpf').addEventListener('input', (e) => e.target.value = mascaraCPF(e.target.value));
    document.getElementById('rg').addEventListener('input', (e) => e.target.value = mascaraRG(e.target.value));
    document.getElementById('telefone').addEventListener('input', (e) => e.target.value = mascaraTel(e.target.value));
    // Garante que o campo número aceite apenas dígitos
    const inputNumero = document.getElementById('numero');
    inputNumero.addEventListener('input', (e) => {
        const valorLimpo = e.target.value.replace(/\D/g, "");
        if (e.target.value !== valorLimpo) {
            e.target.value = valorLimpo;
        }
    });
    document.getElementById('cep').addEventListener('input', (e) => {
        e.target.value = mascaraCEP(e.target.value);
        if (e.target.value.replace(/\D/g, "").length === 8) {
            buscarCEP(e.target.value);
        }
    });

    // --- BUSCA DE CEP (ViaCEP) ---
    const buscarCEP = async (cep) => {
        const cepNumerico = cep.replace(/\D/g, "");
        const loading = document.getElementById('cep-loading');
        const errCep = document.getElementById('err-cep');
        errCep.textContent = '';
        loading.style.display = 'inline';

        try {
            const resp = await fetch(`https://viacep.com.br/ws/${cepNumerico}/json/`);
            const dados = await resp.json();

            if (dados.erro) {
                errCep.textContent = 'CEP não encontrado.';
                limparCamposEndereco();
            } else {
                document.getElementById('logradouro').value = dados.logradouro || '';
                document.getElementById('bairro').value = dados.bairro || '';
                document.getElementById('cidade').value = dados.localidade || '';
                document.getElementById('uf').value = dados.uf || '';
                document.getElementById('numero').focus();
            }
        } catch {
            errCep.textContent = 'Erro ao buscar CEP. Verifique sua conexão.';
        } finally {
            loading.style.display = 'none';
        }
    };

    const limparCamposEndereco = () => {
        ['logradouro', 'bairro', 'cidade', 'uf', 'numero', 'complemento'].forEach(id => {
            document.getElementById(id).value = '';
        });
    };

    // --- VALIDAÇÕES ---
    const validarNome = (nome) => !/\d/.test(nome);
    const validarData = (data) => {
        const hoje = new Date();
        const dataNasc = new Date(data);
        return dataNasc <= hoje;
    };

    const validarComprimentoCPF = (v) => v.replace(/\D/g, "").length === 11;
    const validarComprimentoRG = (v) => v.replace(/[^0-9X]/g, "").length === 9;
    const validarComprimentoTel = (v) => v.replace(/\D/g, "").length === 11;
    const validarComprimentoCEP = (v) => v.replace(/\D/g, "").length === 8;

    // --- CRUD ---
    const renderizarTabela = () => {
        corpoTabela.innerHTML = '';
        alunos.forEach((aluno) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${aluno.rm}</td>
                <td>${aluno.nome}</td>
                <td>${aluno.cpf}</td>
                <td>${aluno.turma}</td>
                <td>${aluno.curso}</td>
                <td>
                    <button class="btn-edit" onclick="editarAluno('${aluno.id}')">Editar</button>
                    <button class="btn-danger" onclick="excluirAluno('${aluno.id}')">Excluir</button>
                </td>
            `;
            corpoTabela.appendChild(tr);
        });
    };

    const gerarRM = () => {
        const ultimoRM = alunos.length > 0 ? Math.max(...alunos.map(a => parseInt(a.rm))) : 0;
        return (ultimoRM + 1).toString().padStart(4, '0');
    };

    const exibirCardSucesso = (aluno) => {
        const enderecoFormatado = `${aluno.logradouro}, ${aluno.numero}${aluno.complemento ? ' – ' + aluno.complemento : ''}, ${aluno.bairro} – ${aluno.cidade}/${aluno.uf}, CEP ${aluno.cep}`;
        detalhesSucesso.innerHTML = `
            <p><strong>RM:</strong> ${aluno.rm}</p>
            <p><strong>Nome:</strong> ${aluno.nome}</p>
            <p><strong>CPF:</strong> ${aluno.cpf}</p>
            <p><strong>Curso:</strong> ${aluno.curso}</p>
            <p><strong>Turma:</strong> ${aluno.turma}</p>
            <p><strong>Endereço:</strong> ${enderecoFormatado}</p>
        `;
        modalSucesso.style.display = 'block';
    };

    formAluno.onsubmit = (e) => {
        e.preventDefault();

        const dados = {
            id: editandoId || Date.now().toString(),
            nome: document.getElementById('nome').value,
            cpf: document.getElementById('cpf').value,
            rg: document.getElementById('rg').value,
            dataNascimento: document.getElementById('dataNascimento').value,
            telefone: document.getElementById('telefone').value,
            responsavel: document.getElementById('responsavel').value,
            turma: document.getElementById('turma').value,
            curso: document.getElementById('curso').value,
            email: document.getElementById('email').value,
            // Endereço
            cep: document.getElementById('cep').value,
            logradouro: document.getElementById('logradouro').value,
            numero: document.getElementById('numero').value,
            complemento: document.getElementById('complemento').value,
            bairro: document.getElementById('bairro').value,
            cidade: document.getElementById('cidade').value,
            uf: document.getElementById('uf').value.toUpperCase(),
        };

        document.querySelectorAll('.error-msg').forEach(el => el.textContent = '');

        let erro = false;

        if (!validarNome(dados.nome)) {
            document.getElementById('err-nome').textContent = 'Nome não pode conter números.';
            erro = true;
        }
        if (!validarNome(dados.responsavel)) {
            document.getElementById('err-resp').textContent = 'Responsável não pode conter números.';
            erro = true;
        }
        if (!validarData(dados.dataNascimento)) {
            document.getElementById('err-data').textContent = 'Data inválida (deve ser hoje ou anterior).';
            erro = true;
        }
        if (!validarComprimentoCPF(dados.cpf)) {
            document.getElementById('err-cpf').textContent = 'CPF deve ter 11 números.';
            erro = true;
        } else {
            const cpfDuplicado = alunos.some(a => a.cpf === dados.cpf && a.id !== dados.id);
            if (cpfDuplicado) {
                document.getElementById('err-cpf').textContent = 'Este CPF já está cadastrado.';
                erro = true;
            }
        }

        if (!validarComprimentoRG(dados.rg)) {
            document.getElementById('err-rg').textContent = 'RG deve ter 9 caracteres.';
            erro = true;
        } else {
            const rgDuplicado = alunos.some(a => a.rg === dados.rg && a.id !== dados.id);
            if (rgDuplicado) {
                document.getElementById('err-rg').textContent = 'Este RG já está cadastrado.';
                erro = true;
            }
        }
        if (!validarComprimentoTel(dados.telefone)) {
            document.getElementById('err-tel').textContent = 'Telefone deve ter 11 números (com DDD).';
            erro = true;
        }

        // Validações de endereço
        if (!validarComprimentoCEP(dados.cep)) {
            document.getElementById('err-cep').textContent = 'CEP deve ter 8 números.';
            erro = true;
        }
        if (!dados.logradouro.trim()) {
            document.getElementById('err-logradouro').textContent = 'Informe o logradouro.';
            erro = true;
        }
        if (!dados.numero.trim()) {
            document.getElementById('err-numero').textContent = 'Informe o número.';
            erro = true;
        }
        if (!dados.bairro.trim()) {
            document.getElementById('err-bairro').textContent = 'Informe o bairro.';
            erro = true;
        }
        if (!dados.cidade.trim()) {
            document.getElementById('err-cidade').textContent = 'Informe a cidade.';
            erro = true;
        }
        if (dados.uf.length !== 2) {
            document.getElementById('err-uf').textContent = 'UF deve ter 2 letras.';
            erro = true;
        }

        if (erro) return;

        let isNovo = !editandoId;

        if (editandoId) {
            const index = alunos.findIndex(a => a.id === editandoId);
            dados.rm = alunos[index].rm;
            alunos[index] = dados;
        } else {
            dados.rm = gerarRM();
            alunos.push(dados);
        }

        localStorage.setItem('alunos', JSON.stringify(alunos));
        renderizarTabela();
        fecharModal();

        if (isNovo) {
            exibirCardSucesso(dados);
        }
    };

    window.editarAluno = (id) => {
        const aluno = alunos.find(a => a.id === id);
        if (aluno) {
            editandoId = id;
            modalTitulo.textContent = 'Editar Aluno (RM: ' + aluno.rm + ')';
            document.getElementById('nome').value = aluno.nome;
            document.getElementById('cpf').value = aluno.cpf;
            document.getElementById('rg').value = aluno.rg;
            document.getElementById('dataNascimento').value = aluno.dataNascimento;
            document.getElementById('telefone').value = aluno.telefone;
            document.getElementById('responsavel').value = aluno.responsavel;
            document.getElementById('turma').value = aluno.turma;
            document.getElementById('curso').value = aluno.curso;
            document.getElementById('email').value = aluno.email;
            // Endereço
            document.getElementById('cep').value = aluno.cep || '';
            document.getElementById('logradouro').value = aluno.logradouro || '';
            document.getElementById('numero').value = aluno.numero || '';
            document.getElementById('complemento').value = aluno.complemento || '';
            document.getElementById('bairro').value = aluno.bairro || '';
            document.getElementById('cidade').value = aluno.cidade || '';
            document.getElementById('uf').value = aluno.uf || '';
            modal.style.display = 'block';
        }
    };

    window.excluirAluno = (id) => {
        if (confirm('Tem certeza que deseja excluir este aluno?')) {
            alunos = alunos.filter(a => a.id !== id);
            localStorage.setItem('alunos', JSON.stringify(alunos));
            renderizarTabela();
        }
    };

    const fecharModal = () => {
        modal.style.display = 'none';
        formAluno.reset();
        editandoId = null;
        modalTitulo.textContent = 'Cadastrar Aluno';
        document.querySelectorAll('.error-msg').forEach(el => el.textContent = '');
    };

    const fecharModalSucesso = () => {
        modalSucesso.style.display = 'none';
    };

    btnNovoAluno.onclick = () => modal.style.display = 'block';
    btnCancelar.onclick = fecharModal;
    spanClose.onclick = fecharModal;

    spanCloseSucesso.onclick = fecharModalSucesso;
    btnOkSucesso.onclick = fecharModalSucesso;

    window.onclick = (e) => {
        if (e.target == modal) fecharModal();
        if (e.target == modalSucesso) fecharModalSucesso();
    };

    renderizarTabela();
});
