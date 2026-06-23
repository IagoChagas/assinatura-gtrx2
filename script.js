/* ============================================================
   GTRX – Sistema de Assinaturas Corporativas
   script.js  |  Lógica completa em Vanilla JS
   ============================================================

   Estrutura:
   01. Configurações globais
   02. Inicialização do EmailJS
   03. Navegação por abas
   04. Upload e pré-visualização de foto
   05. Máscara de telefone
   06. Cargo "Outro"
   07. Validação do formulário
   08. Geração da assinatura
   09. Exportação (PNG + copiar para área de transferência)
   10. LocalStorage – funções CRUD
   11. Tabela de Funcionários Cadastrados
   12. Filtros e pesquisa
   13. Modal de edição
   14. Modal de confirmação de exclusão
   15. Histórico de envios
   16. Exportação CSV / Excel
   17. Dashboard
   18. Envio automático ao RH via EmailJS
   19. Sistema de toasts
   20. Inicialização geral
   ============================================================ */

/* ────────────────────────────────────────────
   01. CONFIGURAÇÕES GLOBAIS
─────────────────────────────────────────── */

/**
 * Chaves do LocalStorage utilizadas pelo sistema.
 */
const LS_FUNCIONARIOS = 'gtrx_funcionarios'; // Array de objetos funcionário
const LS_HISTORICO    = 'gtrx_historico';    // Array de registros de envio

/**
 * Configuração do EmailJS.
 * ─────────────────────────────────────────────────────────────────────
 * INSTRUÇÕES DE CONFIGURAÇÃO:
 * 1. Acesse https://www.emailjs.com e crie uma conta gratuita.
 * 2. Crie um "Email Service" (Gmail, Outlook etc.) e copie o Service ID.
 * 3. Crie um "Email Template" com as variáveis abaixo e copie o Template ID.
 * 4. Copie sua "Public Key" (antes chamada User ID) em Account > API Keys.
 * 5. Substitua os valores das constantes abaixo pelos seus IDs reais.
 *
 * Variáveis usadas no template do EmailJS:
 *   {{to_email}}  – destinatário RH
 *   {{nome}}      – nome do funcionário
 *   {{cargo}}     – cargo
 *   {{departamento}}
 *   {{unidade}}
 *   {{telefone}}
 *   {{email_func}}
 *   {{data}}      – data/hora geração
 * ─────────────────────────────────────────────────────────────────────
 */
const EMAILJS_PUBLIC_KEY  = 'SUA_PUBLIC_KEY_AQUI';  // ex.: 'user_aBcDeFgHiJkLmN'
const EMAILJS_SERVICE_ID  = 'SEU_SERVICE_ID_AQUI';  // ex.: 'service_gmail_gtrx'
const EMAILJS_TEMPLATE_ID = 'SEU_TEMPLATE_ID_AQUI'; // ex.: 'template_assinatura'
const EMAIL_RH            = 'iagocsc00@gmail.com';  // destinatário fixo

/* ────────────────────────────────────────────
   02. INICIALIZAÇÃO DO EMAILJS
─────────────────────────────────────────── */

// Inicializa o SDK do EmailJS com a chave pública
if (typeof emailjs !== 'undefined') {
  emailjs.init(EMAILJS_PUBLIC_KEY);
}

/* ────────────────────────────────────────────
   03. NAVEGAÇÃO POR ABAS
─────────────────────────────────────────── */

// Seleciona todos os botões de aba e painéis
const tabBtns   = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');

/**
 * Ativa a aba pelo atributo data-tab.
 * @param {string} tabName - Identificador da aba (ex.: 'gerar')
 */
function ativarAba(tabName) {
  tabBtns.forEach(btn => {
    const isAtivo = btn.dataset.tab === tabName;
    btn.classList.toggle('active', isAtivo);
    btn.setAttribute('aria-selected', isAtivo);
  });
  tabPanels.forEach(panel => {
    panel.classList.toggle('active', panel.id === `tab-${tabName}`);
  });

  // Atualiza dados ao mudar de aba
  if (tabName === 'funcionarios') renderTabelaFuncionarios();
  if (tabName === 'historico')    renderHistorico();
  if (tabName === 'dashboard')    renderDashboard();
}

// Evento de clique nas abas
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => ativarAba(btn.dataset.tab));
});

/* ────────────────────────────────────────────
   04. UPLOAD E PRÉ-VISUALIZAÇÃO DE FOTO
─────────────────────────────────────────── */

const dropZone       = document.getElementById('drop-zone');
const inputFoto      = document.getElementById('input-foto');
const fotoPreview    = document.getElementById('foto-preview');
const dropPlaceholder = document.getElementById('drop-placeholder');
const btnRemoverFoto = document.getElementById('btn-remover-foto');

// Armazena a foto em base64 para uso na assinatura e envio de e-mail
let fotoBase64 = null;

/** Abre o seletor de arquivo ao clicar na drop zone */
dropZone.addEventListener('click', () => inputFoto.click());

/** Abre o seletor ao pressionar Enter/Espaço na drop zone (acessibilidade) */
dropZone.addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') inputFoto.click();
});

/** Processa o arquivo selecionado via input file */
inputFoto.addEventListener('change', e => {
  if (e.target.files && e.target.files[0]) {
    processarArquivoFoto(e.target.files[0]);
  }
});

/** Eventos de drag & drop */
dropZone.addEventListener('dragover', e => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});
dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('drag-over');
});
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) {
    processarArquivoFoto(file);
  } else {
    toast('Apenas imagens são permitidas (PNG, JPG, WEBP).', 'warning');
  }
});

/**
 * Lê o arquivo de imagem e exibe a pré-visualização.
 * @param {File} file - Arquivo de imagem
 */
function processarArquivoFoto(file) {
  // Valida tamanho (máx. 5 MB)
  if (file.size > 5 * 1024 * 1024) {
    toast('A imagem deve ter no máximo 5 MB.', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = e => {
    fotoBase64 = e.target.result;
    fotoPreview.src = fotoBase64;
    fotoPreview.classList.remove('hidden');
    dropPlaceholder.classList.add('hidden');
    btnRemoverFoto.classList.remove('hidden');
  };
  reader.readAsDataURL(file);
}

/** Remove a foto selecionada */
btnRemoverFoto.addEventListener('click', e => {
  e.stopPropagation(); // Evita abrir o seletor de arquivo
  fotoBase64 = null;
  fotoPreview.src = '';
  fotoPreview.classList.add('hidden');
  dropPlaceholder.classList.remove('hidden');
  btnRemoverFoto.classList.add('hidden');
  inputFoto.value = '';
});

/* ────────────────────────────────────────────
   05. MÁSCARA DE TELEFONE
─────────────────────────────────────────── */

const inputTelefone = document.getElementById('telefone');

/**
 * Aplica máscara de telefone brasileiro: (00) 00000-0000
 * @param {string} value - Valor bruto do input
 * @returns {string} - Valor formatado
 */
function mascaraTelefone(value) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0,2)}) ${digits.slice(2)}`;
  if (digits.length <= 11) return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`;
  return value;
}

inputTelefone.addEventListener('input', () => {
  const pos = inputTelefone.selectionStart;
  inputTelefone.value = mascaraTelefone(inputTelefone.value);
});

/* ────────────────────────────────────────────
   06. CAMPO CARGO "OUTRO"
─────────────────────────────────────────── */

const selectCargo      = document.getElementById('cargo');
const grupoCargo       = document.getElementById('grupo-cargo-outro');
const inputCargoOutro  = document.getElementById('cargo-outro');

/**
 * Exibe ou oculta o campo de cargo personalizado
 * conforme a seleção do usuário.
 */
selectCargo.addEventListener('change', () => {
  const isOutro = selectCargo.value === 'Outro';
  grupoCargo.classList.toggle('hidden', !isOutro);
  if (!isOutro) inputCargoOutro.value = '';
});

/* ────────────────────────────────────────────
   07. VALIDAÇÃO DO FORMULÁRIO
─────────────────────────────────────────── */

/**
 * Exibe ou limpa uma mensagem de erro em um campo.
 * @param {string} id - ID do elemento de erro (ex.: 'err-nome')
 * @param {string} msg - Mensagem de erro (string vazia para limpar)
 */
function setErro(id, msg) {
  const el = document.getElementById(id);
  if (el) el.textContent = msg;

  // Adiciona/remove classe de erro no input correspondente
  const campo = id.replace('err-', '');
  const input = document.getElementById(campo);
  if (input) input.classList.toggle('error', msg !== '');
}

/**
 * Limpa todos os erros do formulário.
 */
function limparErros() {
  ['nome','cargo','cargo-outro','departamento','unidade','telefone','email']
    .forEach(c => setErro(`err-${c}`, ''));
}

/**
 * Valida todos os campos obrigatórios e formato de e-mail.
 * @returns {boolean} - true se válido, false se houver erros
 */
function validarFormulario() {
  limparErros();
  let valido = true;

  const nome  = document.getElementById('nome').value.trim();
  const cargo = selectCargo.value;
  const cargoOutro = inputCargoOutro.value.trim();
  const depto = document.getElementById('departamento').value;
  const unid  = document.getElementById('unidade').value;
  const tel   = inputTelefone.value.trim();
  const email = document.getElementById('email').value.trim();

  if (!nome)  { setErro('err-nome', 'O nome é obrigatório.'); valido = false; }
  if (!cargo) { setErro('err-cargo', 'Selecione um cargo.'); valido = false; }
  if (cargo === 'Outro' && !cargoOutro) {
    setErro('err-cargo-outro', 'Especifique o cargo.'); valido = false;
  }
  if (!depto) { setErro('err-departamento', 'Selecione um departamento.'); valido = false; }
  if (!unid)  { setErro('err-unidade', 'Selecione a unidade.'); valido = false; }
  if (!tel || tel.replace(/\D/g,'').length < 10) {
    setErro('err-telefone', 'Informe um telefone válido.'); valido = false;
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    setErro('err-email', 'Informe um e-mail válido.'); valido = false;
  }
  if (!fotoBase64) {
    toast('É necessário enviar a foto do funcionário.', 'error');
    valido = false;
  }

  return valido;
}

/* ────────────────────────────────────────────
   08. GERAÇÃO DA ASSINATURA
─────────────────────────────────────────── */

const btnCriar         = document.getElementById('btn-criar');
const previewPlaceholder = document.getElementById('preview-placeholder');
const assinaturaWrapper  = document.getElementById('assinatura-wrapper');

// Estado atual (para edição e re-geração)
let dadosAtivos = null;

/**
 * Coleta os dados do formulário e retorna um objeto.
 * @returns {object}
 */
function coletarDados() {
  const cargoVal = selectCargo.value === 'Outro'
    ? inputCargoOutro.value.trim()
    : selectCargo.value;

  return {
    id:          Date.now().toString(),
    nome:        document.getElementById('nome').value.trim(),
    cargo:       cargoVal,
    departamento: document.getElementById('departamento').value,
    unidade:     document.getElementById('unidade').value,
    telefone:    inputTelefone.value.trim(),
    email:       document.getElementById('email').value.trim(),
    foto:        fotoBase64,
    criadoEm:   new Date().toLocaleString('pt-BR'),
  };
}

/**
 * Preenche o bloco visual da assinatura com os dados fornecidos.
 * @param {object} dados
 */
function renderizarAssinatura(dados) {
  document.getElementById('ass-nome').textContent  = dados.nome;
  document.getElementById('ass-cargo').textContent = dados.cargo.toUpperCase();
  document.getElementById('ass-tel').textContent   = dados.telefone;
  document.getElementById('ass-foto').src          = dados.foto;

  // E-mail (oculta a linha se vazio)
  const linhaEmail = document.getElementById('ass-linha-email');
  if (dados.email) {
    document.getElementById('ass-email').textContent = dados.email;
    linhaEmail.classList.remove('hidden');
  } else {
    linhaEmail.classList.add('hidden');
  }

  // Exibe a assinatura e oculta o placeholder
  previewPlaceholder.classList.add('hidden');
  assinaturaWrapper.classList.remove('hidden');
}

/** Evento: clique em "CRIAR ASSINATURA" */
btnCriar.addEventListener('click', () => {
  if (!validarFormulario()) return;

  const dados = coletarDados();
  dadosAtivos = dados;

  // Salva no LocalStorage
  salvarFuncionario(dados);

  // Renderiza a assinatura visualmente
  renderizarAssinatura(dados);

  // Envia e-mail ao RH em background
  enviarEmailRH(dados);

  toast('Assinatura criada com sucesso!', 'success');
});

/* ────────────────────────────────────────────
   09. EXPORTAÇÃO (PNG + CLIPBOARD)
─────────────────────────────────────────── */

/**
 * Captura o elemento da assinatura com html2canvas e retorna um canvas.
 * @returns {Promise<HTMLCanvasElement>}
 */
async function capturarAssinatura() {
  const el = document.getElementById('assinatura-render');
  return await html2canvas(el, {
    scale: 2,            // Alta resolução
    useCORS: true,       // Permite imagens externas
    backgroundColor: '#FFFFFF',
    logging: false,
  });
}

/** Evento: Baixar PNG */
document.getElementById('btn-baixar').addEventListener('click', async () => {
  try {
    const canvas = await capturarAssinatura();
    const link = document.createElement('a');
    link.download = `assinatura_${dadosAtivos.nome.replace(/\s/g, '_')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast('Assinatura baixada com sucesso!', 'success');
  } catch (err) {
    console.error('Erro ao baixar assinatura:', err);
    toast('Erro ao baixar a assinatura.', 'error');
  }
});

/** Evento: Copiar para área de transferência */
document.getElementById('btn-copiar').addEventListener('click', async () => {
  try {
    const canvas = await capturarAssinatura();
    canvas.toBlob(async blob => {
      try {
        // Usa a Clipboard API moderna (suportada nos navegadores atuais)
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        toast('Assinatura copiada para a área de transferência!', 'success');
      } catch {
        // Fallback: copia como URL de dados (menos ideal)
        const url = canvas.toDataURL();
        await navigator.clipboard.writeText(url);
        toast('Imagem copiada (URL). Pode colar em editores que aceitam base64.', 'warning');
      }
    });
  } catch (err) {
    console.error('Erro ao copiar:', err);
    toast('Não foi possível copiar. Tente baixar o PNG.', 'error');
  }
});

/** Evento: Editar dados – preenche o formulário com os dados ativos */
document.getElementById('btn-editar').addEventListener('click', () => {
  if (!dadosAtivos) return;

  // Restaura campos do formulário
  document.getElementById('nome').value = dadosAtivos.nome;
  inputTelefone.value = dadosAtivos.telefone;
  document.getElementById('email').value = dadosAtivos.email || '';

  // Cargo: verifica se é um dos fixos ou "Outro"
  const cargosFixos = Array.from(selectCargo.options).map(o => o.value);
  if (cargosFixos.includes(dadosAtivos.cargo)) {
    selectCargo.value = dadosAtivos.cargo;
    grupoCargo.classList.add('hidden');
  } else {
    selectCargo.value = 'Outro';
    grupoCargo.classList.remove('hidden');
    inputCargoOutro.value = dadosAtivos.cargo;
  }

  document.getElementById('departamento').value = dadosAtivos.departamento;
  document.getElementById('unidade').value = dadosAtivos.unidade;

  // Mantém a foto
  if (dadosAtivos.foto) {
    fotoBase64 = dadosAtivos.foto;
    fotoPreview.src = fotoBase64;
    fotoPreview.classList.remove('hidden');
    dropPlaceholder.classList.add('hidden');
    btnRemoverFoto.classList.remove('hidden');
  }

  // Oculta a assinatura e exibe o formulário
  assinaturaWrapper.classList.add('hidden');
  previewPlaceholder.classList.remove('hidden');

  // Navega para a aba de geração e rola para o topo
  ativarAba('gerar');
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

/** Evento: Nova Assinatura – limpa tudo */
document.getElementById('btn-nova').addEventListener('click', () => {
  limparFormulario();
  assinaturaWrapper.classList.add('hidden');
  previewPlaceholder.classList.remove('hidden');
  dadosAtivos = null;
});

/**
 * Reseta todos os campos do formulário para o estado inicial.
 */
function limparFormulario() {
  document.getElementById('nome').value = '';
  selectCargo.value = '';
  inputCargoOutro.value = '';
  grupoCargo.classList.add('hidden');
  document.getElementById('departamento').value = '';
  document.getElementById('unidade').value = '';
  inputTelefone.value = '';
  document.getElementById('email').value = '';
  fotoBase64 = null;
  fotoPreview.src = '';
  fotoPreview.classList.add('hidden');
  dropPlaceholder.classList.remove('hidden');
  btnRemoverFoto.classList.add('hidden');
  inputFoto.value = '';
  limparErros();
}

/* ────────────────────────────────────────────
   10. LOCALSTORAGE – FUNÇÕES CRUD
─────────────────────────────────────────── */

/**
 * Retorna todos os funcionários salvos.
 * @returns {Array}
 */
function getFuncionarios() {
  return JSON.parse(localStorage.getItem(LS_FUNCIONARIOS) || '[]');
}

/**
 * Salva a lista de funcionários no LocalStorage.
 * @param {Array} lista
 */
function setFuncionarios(lista) {
  localStorage.setItem(LS_FUNCIONARIOS, JSON.stringify(lista));
}

/**
 * Adiciona ou atualiza um funcionário na lista.
 * Se já existir um registro com o mesmo ID, substitui.
 * @param {object} dados
 */
function salvarFuncionario(dados) {
  const lista = getFuncionarios();
  const idx = lista.findIndex(f => f.id === dados.id);
  if (idx >= 0) {
    lista[idx] = dados; // Atualiza
  } else {
    lista.unshift(dados); // Adiciona no início
  }
  setFuncionarios(lista);
}

/**
 * Exclui um funcionário pelo ID.
 * @param {string} id
 */
function excluirFuncionario(id) {
  const lista = getFuncionarios().filter(f => f.id !== id);
  setFuncionarios(lista);
}

/**
 * Retorna o histórico de envios.
 * @returns {Array}
 */
function getHistorico() {
  return JSON.parse(localStorage.getItem(LS_HISTORICO) || '[]');
}

/**
 * Adiciona um registro ao histórico de envios.
 * @param {object} registro
 */
function adicionarHistorico(registro) {
  const hist = getHistorico();
  hist.unshift(registro);
  localStorage.setItem(LS_HISTORICO, JSON.stringify(hist));
}

/* ────────────────────────────────────────────
   11. TABELA DE FUNCIONÁRIOS CADASTRADOS
─────────────────────────────────────────── */

const tbodyFuncionarios   = document.getElementById('tbody-funcionarios');
const emptyFuncionarios   = document.getElementById('empty-funcionarios');
const filtroCargo         = document.getElementById('filtro-cargo');
const filtroDepto         = document.getElementById('filtro-depto');
const buscaGlobal         = document.getElementById('busca-global');

/**
 * Renderiza a tabela de funcionários aplicando filtros e pesquisa.
 */
function renderTabelaFuncionarios() {
  const lista     = getFuncionarios();
  const busca     = (buscaGlobal.value || '').toLowerCase();
  const crgFiltro = filtroCargo.value;
  const dptFiltro = filtroDepto.value;

  // Preenche os filtros dinâmicos com os valores únicos
  preencherFiltros(lista);

  // Filtragem
  const filtrada = lista.filter(f => {
    const matchBusca = !busca || [f.nome, f.cargo, f.departamento]
      .some(v => v && v.toLowerCase().includes(busca));
    const matchCargo = !crgFiltro || f.cargo === crgFiltro;
    const matchDepto = !dptFiltro || f.departamento === dptFiltro;
    return matchBusca && matchCargo && matchDepto;
  });

  // Exibe estado vazio ou popula a tabela
  emptyFuncionarios.classList.toggle('hidden', filtrada.length > 0);
  tbodyFuncionarios.innerHTML = '';

  filtrada.forEach(f => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="td-nome">${escapar(f.nome)}</td>
      <td>${escapar(f.cargo)}</td>
      <td>${escapar(f.departamento)}</td>
      <td>${escapar(f.telefone)}</td>
      <td>${escapar(f.email || '—')}</td>
      <td>
        <div class="td-acoes">
          <button class="btn btn-outline btn-sm" onclick="gerarNovamente('${f.id}')">Gerar</button>
          <button class="btn btn-ghost btn-sm" onclick="abrirModalEditar('${f.id}')">Editar</button>
          <button class="btn btn-danger btn-sm" onclick="abrirModalExcluir('${f.id}')">Excluir</button>
        </div>
      </td>
    `;
    tbodyFuncionarios.appendChild(tr);
  });
}

/**
 * Preenche os selects de filtro com os valores únicos do conjunto de dados.
 * Preserva a seleção atual para não resetar ao filtrar.
 * @param {Array} lista
 */
function preencherFiltros(lista) {
  const cargosSet = [...new Set(lista.map(f => f.cargo).filter(Boolean))].sort();
  const deptosSet = [...new Set(lista.map(f => f.departamento).filter(Boolean))].sort();

  const crgAtual = filtroCargo.value;
  const dptAtual = filtroDepto.value;

  filtroCargo.innerHTML = '<option value="">Todos os cargos</option>' +
    cargosSet.map(c => `<option value="${escapar(c)}" ${c === crgAtual ? 'selected' : ''}>${escapar(c)}</option>`).join('');

  filtroDepto.innerHTML = '<option value="">Todos os departamentos</option>' +
    deptosSet.map(d => `<option value="${escapar(d)}" ${d === dptAtual ? 'selected' : ''}>${escapar(d)}</option>`).join('');
}

/**
 * Re-gera a assinatura de um funcionário existente.
 * @param {string} id
 */
function gerarNovamente(id) {
  const f = getFuncionarios().find(f => f.id === id);
  if (!f) return;

  dadosAtivos = f;
  fotoBase64 = f.foto;
  renderizarAssinatura(f);
  ativarAba('gerar');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ────────────────────────────────────────────
   12. FILTROS E PESQUISA
─────────────────────────────────────────── */

// Aplica renderização ao digitar ou alterar filtros
buscaGlobal.addEventListener('input', renderTabelaFuncionarios);
filtroCargo.addEventListener('change', renderTabelaFuncionarios);
filtroDepto.addEventListener('change', renderTabelaFuncionarios);

/* ────────────────────────────────────────────
   13. MODAL DE EDIÇÃO
─────────────────────────────────────────── */

const modalEditar  = document.getElementById('modal-editar');
const modalClose   = document.getElementById('modal-close');
const modalCancelar = document.getElementById('modal-cancelar');
const modalSalvar  = document.getElementById('modal-salvar');

/**
 * Abre o modal de edição preenchendo os campos com os dados do funcionário.
 * @param {string} id
 */
function abrirModalEditar(id) {
  const f = getFuncionarios().find(f => f.id === id);
  if (!f) return;

  document.getElementById('edit-id').value          = f.id;
  document.getElementById('edit-nome').value         = f.nome;
  document.getElementById('edit-cargo').value        = f.cargo;
  document.getElementById('edit-departamento').value = f.departamento;
  document.getElementById('edit-unidade').value      = f.unidade;
  document.getElementById('edit-telefone').value     = f.telefone;
  document.getElementById('edit-email').value        = f.email || '';

  modalEditar.classList.remove('hidden');
  document.getElementById('edit-nome').focus();
}

/** Fecha o modal de edição */
function fecharModalEditar() {
  modalEditar.classList.add('hidden');
}

modalClose.addEventListener('click', fecharModalEditar);
modalCancelar.addEventListener('click', fecharModalEditar);
modalEditar.addEventListener('click', e => {
  if (e.target === modalEditar) fecharModalEditar();
});

/** Salva as alterações feitas no modal de edição */
modalSalvar.addEventListener('click', () => {
  const id = document.getElementById('edit-id').value;
  const lista = getFuncionarios();
  const idx = lista.findIndex(f => f.id === id);
  if (idx < 0) return;

  lista[idx] = {
    ...lista[idx],
    nome:         document.getElementById('edit-nome').value.trim(),
    cargo:        document.getElementById('edit-cargo').value.trim(),
    departamento: document.getElementById('edit-departamento').value,
    unidade:      document.getElementById('edit-unidade').value,
    telefone:     document.getElementById('edit-telefone').value.trim(),
    email:        document.getElementById('edit-email').value.trim(),
  };

  setFuncionarios(lista);
  fecharModalEditar();
  renderTabelaFuncionarios();
  toast('Dados do colaborador atualizados!', 'success');
});

/* ────────────────────────────────────────────
   14. MODAL DE CONFIRMAÇÃO DE EXCLUSÃO
─────────────────────────────────────────── */

const modalExcluir    = document.getElementById('modal-excluir');
const excluirClose    = document.getElementById('excluir-close');
const excluirCancelar = document.getElementById('excluir-cancelar');
const excluirConfirmar = document.getElementById('excluir-confirmar');

let idParaExcluir = null;

/**
 * Abre o modal de confirmação de exclusão.
 * @param {string} id
 */
function abrirModalExcluir(id) {
  const f = getFuncionarios().find(f => f.id === id);
  if (!f) return;

  idParaExcluir = id;
  document.getElementById('excluir-nome').textContent = f.nome;
  modalExcluir.classList.remove('hidden');
}

/** Fecha o modal de exclusão */
function fecharModalExcluir() {
  modalExcluir.classList.add('hidden');
  idParaExcluir = null;
}

excluirClose.addEventListener('click', fecharModalExcluir);
excluirCancelar.addEventListener('click', fecharModalExcluir);
modalExcluir.addEventListener('click', e => {
  if (e.target === modalExcluir) fecharModalExcluir();
});

/** Confirma e executa a exclusão */
excluirConfirmar.addEventListener('click', () => {
  if (!idParaExcluir) return;
  excluirFuncionario(idParaExcluir);
  fecharModalExcluir();
  renderTabelaFuncionarios();
  toast('Funcionário excluído com sucesso.', 'success');
});

/* ────────────────────────────────────────────
   15. HISTÓRICO DE ENVIOS
─────────────────────────────────────────── */

const tbodyHistorico  = document.getElementById('tbody-historico');
const emptyHistorico  = document.getElementById('empty-historico');
const btnLimparHist   = document.getElementById('btn-limpar-historico');

/**
 * Renderiza a tabela de histórico de envios ao RH.
 */
function renderHistorico() {
  const hist = getHistorico();

  emptyHistorico.classList.toggle('hidden', hist.length > 0);
  tbodyHistorico.innerHTML = '';

  hist.forEach(r => {
    const statusBadge = r.status === 'Enviado'
      ? `<span class="badge badge-success">✓ Enviado</span>`
      : `<span class="badge badge-error">✗ Falha</span>`;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapar(r.data)}</td>
      <td class="td-nome">${escapar(r.nome)}</td>
      <td>${escapar(r.email || '—')}</td>
      <td>${escapar(r.cargo)}</td>
      <td>${statusBadge}</td>
    `;
    tbodyHistorico.appendChild(tr);
  });
}

/** Limpa todo o histórico de envios */
btnLimparHist.addEventListener('click', () => {
  if (!confirm('Deseja apagar todo o histórico de envios?')) return;
  localStorage.setItem(LS_HISTORICO, '[]');
  renderHistorico();
  toast('Histórico limpo.', 'success');
});

/* ────────────────────────────────────────────
   16. EXPORTAÇÃO CSV / EXCEL
─────────────────────────────────────────── */

/** Evento: Exportar CSV */
document.getElementById('btn-export-csv').addEventListener('click', () => {
  const lista = getFuncionarios();
  if (lista.length === 0) { toast('Nenhum funcionário para exportar.', 'warning'); return; }

  const cabecalho = ['Nome', 'Cargo', 'Departamento', 'Unidade', 'Telefone', 'E-mail', 'Criado Em'];
  const linhas = lista.map(f => [
    f.nome, f.cargo, f.departamento, f.unidade, f.telefone, f.email || '', f.criadoEm
  ]);

  const csv = [cabecalho, ...linhas]
    .map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, 'funcionarios_gtrx.csv');
  toast('CSV exportado com sucesso!', 'success');
});

/** Evento: Exportar Excel (.xlsx) via SheetJS */
document.getElementById('btn-export-xlsx').addEventListener('click', () => {
  const lista = getFuncionarios();
  if (lista.length === 0) { toast('Nenhum funcionário para exportar.', 'warning'); return; }

  const dados = lista.map(f => ({
    Nome: f.nome,
    Cargo: f.cargo,
    Departamento: f.departamento,
    Unidade: f.unidade,
    Telefone: f.telefone,
    'E-mail': f.email || '',
    'Criado Em': f.criadoEm,
  }));

  const ws = XLSX.utils.json_to_sheet(dados);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Funcionários GTRX');
  XLSX.writeFile(wb, 'funcionarios_gtrx.xlsx');
  toast('Excel exportado com sucesso!', 'success');
});

/**
 * Utilitário: cria um link temporário e dispara o download de um Blob.
 * @param {Blob} blob
 * @param {string} filename
 */
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ────────────────────────────────────────────
   17. DASHBOARD
─────────────────────────────────────────── */

/**
 * Renderiza os KPIs e gráficos do dashboard.
 */
function renderDashboard() {
  const lista = getFuncionarios();
  const hist  = getHistorico();

  // KPIs
  document.getElementById('kpi-total').textContent    = lista.length;
  document.getElementById('kpi-enviados').textContent  = hist.length;
  document.getElementById('kpi-sucesso').textContent   = hist.filter(r => r.status === 'Enviado').length;
  document.getElementById('kpi-falhas').textContent    = hist.filter(r => r.status === 'Falha').length;

  // Gráfico por Departamento
  const porDepto = contarPor(lista, 'departamento');
  renderBarChart('chart-depto', porDepto, 'blue');

  // Gráfico por Cargo
  const porCargo = contarPor(lista, 'cargo');
  renderBarChart('chart-cargo', porCargo, 'orange');
}

/**
 * Agrupa e conta os registros por uma chave.
 * @param {Array} lista
 * @param {string} chave
 * @returns {Array<{label, count}>} - Ordenado por count desc
 */
function contarPor(lista, chave) {
  const mapa = {};
  lista.forEach(f => {
    const v = f[chave] || 'Não informado';
    mapa[v] = (mapa[v] || 0) + 1;
  });
  return Object.entries(mapa)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Renderiza um gráfico de barras horizontal simples dentro de um container.
 * @param {string} containerId
 * @param {Array<{label, count}>} dados
 * @param {'blue'|'orange'} cor
 */
function renderBarChart(containerId, dados, cor = 'blue') {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (dados.length === 0) {
    container.innerHTML = '<p class="chart-empty">Sem dados para exibir.</p>';
    return;
  }

  const max = dados[0].count; // Maior valor (já ordenado desc)
  container.innerHTML = dados.map(({ label, count }) => {
    const pct = Math.round((count / max) * 100);
    const corClass = cor === 'orange' ? 'orange' : '';
    return `
      <div class="bar-item">
        <span class="bar-label" title="${escapar(label)}">${escapar(label)}</span>
        <div class="bar-track">
          <div class="bar-fill ${corClass}" style="width: ${pct}%"></div>
        </div>
        <span class="bar-count">${count}</span>
      </div>
    `;
  }).join('');
}

/* ────────────────────────────────────────────
   18. ENVIO AUTOMÁTICO AO RH VIA EMAILJS
─────────────────────────────────────────── */

/**
 * Envia os dados do novo colaborador ao e-mail do RH via EmailJS.
 * Registra o resultado no histórico independentemente do sucesso.
 * @param {object} dados
 */
async function enviarEmailRH(dados) {
  const agora = new Date().toLocaleString('pt-BR');

  // Se o EmailJS não foi configurado, registra como falha
  if (EMAILJS_PUBLIC_KEY === 'SUA_PUBLIC_KEY_AQUI') {
    console.warn('EmailJS não configurado. Configure as chaves em script.js.');
    adicionarHistorico({
      data: agora,
      nome: dados.nome,
      email: dados.email,
      cargo: dados.cargo,
      status: 'Falha',
      motivo: 'EmailJS não configurado',
    });
    return;
  }

  // Parâmetros enviados para o template do EmailJS
  const templateParams = {
    to_email:     EMAIL_RH,
    nome:         dados.nome,
    cargo:        dados.cargo,
    departamento: dados.departamento,
    unidade:      dados.unidade,
    telefone:     dados.telefone,
    email_func:   dados.email || 'Não informado',
    data:         agora,
  };

  try {
    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams);

    adicionarHistorico({
      data:   agora,
      nome:   dados.nome,
      email:  dados.email,
      cargo:  dados.cargo,
      status: 'Enviado',
    });
    toast('E-mail enviado ao RH com sucesso!', 'success');
  } catch (err) {
    console.error('Falha ao enviar e-mail:', err);
    adicionarHistorico({
      data:   agora,
      nome:   dados.nome,
      email:  dados.email,
      cargo:  dados.cargo,
      status: 'Falha',
      motivo: err.text || String(err),
    });
    toast('Erro ao enviar e-mail ao RH. Verifique o console.', 'error');
  }
}

/* ────────────────────────────────────────────
   19. SISTEMA DE TOASTS
─────────────────────────────────────────── */

const toastContainer = document.getElementById('toast-container');

/**
 * Exibe uma notificação toast.
 * @param {string} mensagem - Texto da notificação
 * @param {'success'|'error'|'warning'|'info'} tipo - Tipo visual
 * @param {number} duracao - Tempo em ms antes de sumir (padrão: 3500)
 */
function toast(mensagem, tipo = 'info', duracao = 3500) {
  const icones = {
    success: '✓',
    error:   '✕',
    warning: '⚠',
    info:    'ℹ',
  };

  const el = document.createElement('div');
  el.className = `toast ${tipo}`;
  el.innerHTML = `
    <span class="toast-icon">${icones[tipo] || 'ℹ'}</span>
    <span class="toast-msg">${escapar(mensagem)}</span>
  `;

  toastContainer.appendChild(el);

  // Remove automaticamente após a duração
  setTimeout(() => {
    el.classList.add('hide');
    el.addEventListener('transitionend', () => el.remove());
  }, duracao);
}

/* ────────────────────────────────────────────
   UTILITÁRIO: Escaping XSS
─────────────────────────────────────────── */

/**
 * Escapa caracteres HTML para evitar XSS ao inserir dados no DOM.
 * @param {string} str
 * @returns {string}
 */
function escapar(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* ────────────────────────────────────────────
   20. INICIALIZAÇÃO GERAL
─────────────────────────────────────────── */

/**
 * Executado assim que o DOM estiver pronto.
 * Garante que os dados do LocalStorage sejam carregados
 * na primeira renderização de cada aba.
 */
document.addEventListener('DOMContentLoaded', () => {
  // Aba padrão já está ativa via HTML (.active), não precisa chamar ativarAba.
  // Apenas pré-carrega os filtros da tabela de funcionários em segundo plano.
  const lista = getFuncionarios();
  preencherFiltros(lista);

  console.log(
    '%c GTRX Sistema de Assinaturas %c v1.0.0 ',
    'background:#1B4FBE;color:#fff;font-weight:700;padding:4px 8px;border-radius:4px 0 0 4px;',
    'background:#F5820A;color:#fff;font-weight:700;padding:4px 8px;border-radius:0 4px 4px 0;'
  );
});
