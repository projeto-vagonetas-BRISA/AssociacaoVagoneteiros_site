const API = window.location.origin;

let authToken = localStorage.getItem('dev_token');
let authUser = JSON.parse(localStorage.getItem('dev_user') || 'null');

// ---------------------------------------
// UTILITÁRIOS
// ---------------------------------------
function apiUrl(path) { return `${API}${path}`; }

async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...opts.headers };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
  const res = await fetch(apiUrl(path), { ...opts, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || `Erro ${res.status}`);
  return data;
}

function $(sel) { return document.querySelector(sel); }
function $$(sel) { return document.querySelectorAll(sel); }

function el(tag, attrs = {}, children = []) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'className') e.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v);
  }
  for (const c of (Array.isArray(children) ? children : [children])) {
    if (c == null) continue;
    e.append(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return e;
}

function showMessage(msg, type = 'error') {
  const el = $('#message');
  if (!el) return;
  el.textContent = msg;
  el.className = `alert alert-${type}`;
  el.style.display = 'block';
  setTimeout(() => el.style.display = 'none', 4000);
}

function showModal(title, bodyEl, onConfirm) {
  const overlay = el('div', { className: 'modal-overlay' });
  const modal = el('div', { className: 'modal' });
  const h3 = el('h3', {}, title);
  const actions = el('div', { className: 'form-actions', style: { marginTop: '1.5rem' } });
  const btnCancel = el('button', { className: 'btn btn-outline', onClick: () => overlay.remove() }, 'Cancelar');
  const btnConfirm = el('button', { className: 'btn btn-primary' }, 'Salvar');

  if (onConfirm) {
    btnConfirm.onclick = async () => {
      btnConfirm.disabled = true;
      btnConfirm.innerHTML = '<span class="spinner"></span> Salvando...';
      try { await onConfirm(); overlay.remove(); } catch (e) { showMessage(e.message); }
      btnConfirm.disabled = false;
    };
  } else {
    btnConfirm.onclick = () => overlay.remove();
  }

  actions.append(btnCancel, btnConfirm);
  modal.append(h3, bodyEl, actions);
  overlay.append(modal);
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  document.body.append(overlay);
  return { overlay, modal, btnConfirm, btnCancel };
}

function loadingBtn(text = 'Carregando...') {
  return `<span class="spinner"></span> ${text}`;
}

function navigateTo(page) {
  $$('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(`page-${page}`);
  if (target) target.classList.add('active');
  $$('.sidebar a').forEach(a => a.classList.remove('active'));
  const link = $(`.sidebar a[data-page="${page}"]`);
  if (link) link.classList.add('active');
  window.location.hash = page;
}

// ---------------------------------------
// AUTENTICAÇÃO
// ---------------------------------------
function checkAuth() {
  if (!authToken) {
    $('#app-login').style.display = 'flex';
    $('#app-main').style.display = 'none';
    return false;
  }
  $('#app-login').style.display = 'none';
  $('#app-main').style.display = 'flex';
  $('#user-name').textContent = authUser?.name || 'Usuário';
  $('#user-perfil').textContent = authUser?.perfil || '';
  return true;
}

async function doLogin(e) {
  e.preventDefault();
  const identifier = $('#login-identifier').value;
  const senha = $('#login-senha').value;
  const btn = $('#login-btn');
  if (!identifier || !senha) { showMessage('Preencha todos os campos'); return; }

  btn.disabled = true;
  btn.innerHTML = loadingBtn();
  try {
    const data = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, senha }),
    });
    authToken = data.token;
    authUser = data.user;
    localStorage.setItem('dev_token', authToken);
    localStorage.setItem('dev_user', JSON.stringify(authUser));
    checkAuth();
    navigateTo('passeios');
  } catch (err) {
    showMessage(err.message);
  }
  btn.disabled = false;
  btn.textContent = 'Entrar';
}

function doLogout() {
  authToken = null;
  authUser = null;
  localStorage.removeItem('dev_token');
  localStorage.removeItem('dev_user');
  checkAuth();
}

// ---------------------------------------
// PASSEIOS
// ---------------------------------------
async function loadPasseios() {
  const tbody = $('#passeios-tbody');
  tbody.innerHTML = '<tr><td colspan="6" class="empty">Carregando...</td></tr>';
  try {
    const data = await api('/passeios');
    if (!data.length) { tbody.innerHTML = '<tr><td colspan="6" class="empty">Nenhum passeio cadastrado</td></tr>'; return; }
    tbody.innerHTML = '';
    for (const p of data) {
      const tr = el('tr', {}, [
        el('td', {}, String(p.id)),
        el('td', {}, formatDate(p.data)),
        el('td', {}, `R$ ${Number(p.valor).toFixed(2)}`),
        el('td', {}, String(p.capacidade)),
        el('td', {}, p.usuario?.name || '-'),
        el('td', { className: 'flex gap-1' }, [
          el('button', { className: 'btn btn-sm btn-primary', onClick: () => editPasseio(p) }, 'Editar'),
          el('button', { className: 'btn btn-sm btn-danger', onClick: () => deletePasseio(p.id) }, 'Deletar'),
        ]),
      ]);
      tbody.append(tr);
    }
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty">Erro: ${e.message}</td></tr>`;
  }
}

function openNewPasseio() {
  const form = el('div', { className: 'form-grid' }, [
    el('div', { className: 'full' }, [el('label', {}, 'Data'), el('input', { type: 'datetime-local', id: 'f-passeio-data', required: true })]),
    el('div', {}, [el('label', {}, 'Valor (R$)'), el('input', { type: 'number', step: '0.01', min: '0.01', id: 'f-passeio-valor', required: true, placeholder: '50.00' })]),
    el('div', {}, [el('label', {}, 'Capacidade (vagas)'), el('input', { type: 'number', min: '1', id: 'f-passeio-capacidade', required: true, placeholder: '20' })]),
  ]);
  showModal('Novo Passeio', form, async () => {
    await api('/passeios', {
      method: 'POST',
      body: JSON.stringify({
        data: $('#f-passeio-data').value,
        valor: $('#f-passeio-valor').value,
        capacidade: $('#f-passeio-capacidade').value,
      }),
    });
    loadPasseios();
  });
}

function editPasseio(p) {
  const form = el('div', { className: 'form-grid' }, [
    el('div', { className: 'full' }, [el('label', {}, 'Data'), el('input', { type: 'datetime-local', id: 'f-passeio-data', value: toDatetimeLocal(p.data) })]),
    el('div', {}, [el('label', {}, 'Valor (R$)'), el('input', { type: 'number', step: '0.01', min: '0.01', id: 'f-passeio-valor', value: p.valor })]),
    el('div', {}, [el('label', {}, 'Capacidade (vagas)'), el('input', { type: 'number', min: '1', id: 'f-passeio-capacidade', value: p.capacidade })]),
  ]);
  showModal(`Editar Passeio #${p.id}`, form, async () => {
    await api(`/passeios/${p.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        data: $('#f-passeio-data').value,
        valor: $('#f-passeio-valor').value,
        capacidade: $('#f-passeio-capacidade').value,
      }),
    });
    loadPasseios();
  });
}

async function deletePasseio(id) {
  if (!confirm(`Deletar passeio #${id}?`)) return;
  try {
    await api(`/passeios/${id}`, { method: 'DELETE' });
    loadPasseios();
  } catch (e) { showMessage(e.message); }
}

// ---------------------------------------
// CLIENTES
// ---------------------------------------
async function loadClientes() {
  const tbody = $('#clientes-tbody');
  tbody.innerHTML = '<tr><td colspan="6" class="empty">Carregando...</td></tr>';
  try {
    const data = await api('/clientes');
    if (!data.length) { tbody.innerHTML = '<tr><td colspan="6" class="empty">Nenhum cliente cadastrado</td></tr>'; return; }
    tbody.innerHTML = '';
    for (const c of data) {
      const tr = el('tr', {}, [
        el('td', {}, String(c.id)),
        el('td', { className: 'font-mono' }, c.cpf),
        el('td', {}, c.nome),
        el('td', {}, c.telefone),
        el('td', {}, c.email || '-'),
        el('td', { className: 'flex gap-1' }, [
          el('button', { className: 'btn btn-sm btn-primary', onClick: () => editCliente(c) }, 'Editar'),
          el('button', { className: 'btn btn-sm btn-danger', onClick: () => deleteCliente(c.id) }, 'Deletar'),
        ]),
      ]);
      tbody.append(tr);
    }
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty">Erro: ${e.message}</td></tr>`;
  }
}

function openNewCliente() {
  const form = el('div', { className: 'form-grid' }, [
    el('div', { className: 'full' }, [el('label', {}, 'Nome'), el('input', { type: 'text', id: 'f-cliente-nome', required: true, placeholder: 'Nome completo' })]),
    el('div', {}, [el('label', {}, 'CPF'), el('input', { type: 'text', id: 'f-cliente-cpf', required: true, placeholder: '000.000.000-00' })]),
    el('div', {}, [el('label', {}, 'Telefone'), el('input', { type: 'text', id: 'f-cliente-telefone', required: true, placeholder: '(53) 99999-9999' })]),
    el('div', { className: 'full' }, [el('label', {}, 'E-mail'), el('input', { type: 'email', id: 'f-cliente-email', placeholder: 'cliente@email.com' })]),
  ]);
  showModal('Novo Cliente', form, async () => {
    await api('/clientes', {
      method: 'POST',
      body: JSON.stringify({
        nome: $('#f-cliente-nome').value,
        cpf: $('#f-cliente-cpf').value,
        telefone: $('#f-cliente-telefone').value,
        email: $('#f-cliente-email').value || undefined,
      }),
    });
    loadClientes();
  });
}

function editCliente(c) {
  const form = el('div', { className: 'form-grid' }, [
    el('div', { className: 'full' }, [el('label', {}, 'Nome'), el('input', { type: 'text', id: 'f-cliente-nome', value: c.nome })]),
    el('div', {}, [el('label', {}, 'Telefone'), el('input', { type: 'text', id: 'f-cliente-telefone', value: c.telefone })]),
    el('div', { className: 'full' }, [el('label', {}, 'E-mail'), el('input', { type: 'email', id: 'f-cliente-email', value: c.email || '' })]),
  ]);
  showModal(`Editar Cliente #${c.id} - ${c.nome}`, form, async () => {
    await api(`/clientes/${c.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        nome: $('#f-cliente-nome').value,
        telefone: $('#f-cliente-telefone').value,
        email: $('#f-cliente-email').value || null,
      }),
    });
    loadClientes();
  });
}

async function deleteCliente(id) {
  if (!confirm(`Deletar cliente #${id}?`)) return;
  try {
    await api(`/clientes/${id}`, { method: 'DELETE' });
    loadClientes();
  } catch (e) { showMessage(e.message); }
}

// ---------------------------------------
// AGENDAMENTOS
// ---------------------------------------
let _passeiosCache = [];
let _clientesCache = [];

async function loadAgendamentos() {
  const tbody = $('#agendamentos-tbody');
  tbody.innerHTML = '<tr><td colspan="6" class="empty">Carregando...</td></tr>';
  try {
    const [agendamentos, passeios, clientes] = await Promise.all([
      api('/agendamentos'),
      api('/passeios'),
      api('/clientes'),
    ]);
    _passeiosCache = passeios;
    _clientesCache = clientes;

    if (!agendamentos.length) { tbody.innerHTML = '<tr><td colspan="6" class="empty">Nenhum agendamento encontrado</td></tr>'; return; }
    tbody.innerHTML = '';
    for (const a of agendamentos) {
      const tr = el('tr', {}, [
        el('td', {}, String(a.id)),
        el('td', {}, a.cliente?.nome || `#${a.clienteId}`),
        el('td', {}, formatDate(a.passeio?.data)),
        el('td', {}, a.passeio ? `R$ ${Number(a.passeio.valor).toFixed(2)}` : '-'),
        el('td', {}, el('span', { className: `badge-status badge-${a.status}` }, a.status)),
        el('td', { className: 'flex gap-1' }, [
          el('button', { className: 'btn btn-sm btn-warning', onClick: () => changeStatus(a) }, 'Status'),
          el('button', { className: 'btn btn-sm btn-danger', onClick: () => deleteAgendamento(a.id) }, 'Deletar'),
        ]),
      ]);
      tbody.append(tr);
    }
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty">Erro: ${e.message}</td></tr>`;
  }
}

function openNewAgendamento() {
  const statusOpts = ['PENDENTE', 'CONFIRMADO', 'CANCELADO', 'REMARCADO'];
  const form = el('div', { className: 'form-grid' }, [
    el('div', { className: 'full' }, [el('label', {}, 'Cliente'), el('select', { id: 'f-agen-cliente' },
      _clientesCache.map(c => el('option', { value: c.id }, `${c.nome} (${c.cpf})`))
    )]),
    el('div', { className: 'full' }, [el('label', {}, 'Passeio'), el('select', { id: 'f-agen-passeio' },
      _passeiosCache.map(p => el('option', { value: p.id }, `${formatDate(p.data)} - ${p.capacidade} vagas - R$ ${Number(p.valor).toFixed(2)}`))
    )]),
  ]);
  showModal('Novo Agendamento', form, async () => {
    await api('/agendamentos', {
      method: 'POST',
      body: JSON.stringify({
        clienteId: $('#f-agen-cliente').value,
        passeioId: $('#f-agen-passeio').value,
      }),
    });
    loadAgendamentos();
  });
}

function changeStatus(a) {
  const opts = ['PENDENTE', 'CONFIRMADO', 'CANCELADO', 'REMARCADO'];
  const form = el('div', { className: 'form-grid' }, [
    el('div', { className: 'full' }, [el('label', {}, 'Novo Status'), el('select', { id: 'f-agen-status' },
      opts.map(s => el('option', { value: s, selected: s === a.status }, s))
    )]),
  ]);
  showModal(`Alterar Status - Agendamento #${a.id}`, form, async () => {
    await api(`/agendamentos/${a.id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: $('#f-agen-status').value }),
    });
    loadAgendamentos();
  });
}

async function deleteAgendamento(id) {
  if (!confirm(`Deletar agendamento #${id}?`)) return;
  try {
    await api(`/agendamentos/${id}`, { method: 'DELETE' });
    loadAgendamentos();
  } catch (e) { showMessage(e.message); }
}

// ---------------------------------------
// AVALIAÇÕES
// ---------------------------------------
async function loadAvaliacoes() {
  const tbody = $('#avaliacoes-tbody');
  tbody.innerHTML = '<tr><td colspan="6" class="empty">Carregando...</td></tr>';
  try {
    const data = await api('/avaliacoes');
    if (!data.length) { tbody.innerHTML = '<tr><td colspan="6" class="empty">Nenhuma avaliação encontrada</td></tr>'; return; }
    tbody.innerHTML = '';
    for (const a of data) {
      const stars = '★'.repeat(a.nota) + '☆'.repeat(5 - a.nota);
      const tr = el('tr', {}, [
        el('td', {}, String(a.id)),
        el('td', {}, a.cliente?.nome || `#${a.clienteId}`),
        el('td', {}, a.passeio ? formatDate(a.passeio.data) : '-'),
        el('td', {}, stars),
        el('td', { className: 'truncate', style: { maxWidth: '200px' } }, a.comentario),
        el('td', { className: 'flex gap-1' }, [
          el('button', { className: 'btn btn-sm btn-primary', onClick: () => editAvaliacao(a) }, 'Editar'),
          el('button', { className: 'btn btn-sm btn-danger', onClick: () => deleteAvaliacao(a.id) }, 'Deletar'),
        ]),
      ]);
      tbody.append(tr);
    }
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty">Erro: ${e.message}</td></tr>`;
  }
}

async function openNewAvaliacao() {
  let clientes, passeios;
  try { clientes = await api('/clientes'); passeios = await api('/passeios'); } catch (e) { showMessage(e.message); return; }

  const form = el('div', { className: 'form-grid' }, [
    el('div', { className: 'full' }, [el('label', {}, 'Cliente'), el('select', { id: 'f-aval-cliente' },
      clientes.map(c => el('option', { value: c.id }, `${c.nome} (${c.cpf})`))
    )]),
    el('div', { className: 'full' }, [el('label', {}, 'Passeio'), el('select', { id: 'f-aval-passeio' },
      passeios.map(p => el('option', { value: p.id }, `${formatDate(p.data)} - R$ ${Number(p.valor).toFixed(2)}`))
    )]),
    el('div', {}, [el('label', {}, 'Nota (1-5)'), el('input', { type: 'number', min: '1', max: '5', id: 'f-aval-nota', value: '5' })]),
    el('div', { className: 'full' }, [el('label', {}, 'Comentário'), el('textarea', { id: 'f-aval-comentario', placeholder: 'Opcional...', rows: '3' })]),
  ]);
  showModal('Nova Avaliação', form, async () => {
    await api('/avaliacoes', {
      method: 'POST',
      body: JSON.stringify({
        nota: $('#f-aval-nota').value,
        comentario: $('#f-aval-comentario').value,
        clienteId: $('#f-aval-cliente').value,
        passeioId: $('#f-aval-passeio').value,
      }),
    });
    loadAvaliacoes();
  });
}

function editAvaliacao(a) {
  const form = el('div', { className: 'form-grid' }, [
    el('div', {}, [el('label', {}, 'Nota (1-5)'), el('input', { type: 'number', min: '1', max: '5', id: 'f-aval-nota', value: a.nota })]),
    el('div', { className: 'full' }, [el('label', {}, 'Comentário'), el('textarea', { id: 'f-aval-comentario', rows: '3' }, a.comentario || '')]),
  ]);
  showModal(`Editar Avaliação #${a.id}`, form, async () => {
    await api(`/avaliacoes/${a.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        nota: $('#f-aval-nota').value,
        comentario: $('#f-aval-comentario').value,
      }),
    });
    loadAvaliacoes();
  });
}

async function deleteAvaliacao(id) {
  if (!confirm(`Deletar avaliação #${id}?`)) return;
  try {
    await api(`/avaliacoes/${id}`, { method: 'DELETE' });
    loadAvaliacoes();
  } catch (e) { showMessage(e.message); }
}

// ---------------------------------------
// USUÁRIOS
// ---------------------------------------
async function loadUsuarios() {
  const tbody = $('#usuarios-tbody');
  tbody.innerHTML = '<tr><td colspan="6" class="empty">Carregando...</td></tr>';
  try {
    const data = await api('/usuarios');
    if (!data.length) { tbody.innerHTML = '<tr><td colspan="6" class="empty">Nenhum usuário encontrado</td></tr>'; return; }
    tbody.innerHTML = '';
    for (const u of data) {
      const tr = el('tr', {}, [
        el('td', {}, String(u.id)),
        el('td', {}, u.name),
        el('td', { className: 'font-mono' }, u.cpf),
        el('td', {}, u.email || '-'),
        el('td', {}, el('span', { className: `badge-status badge-${u.perfil}` }, u.perfil)),
        el('td', { className: 'flex gap-1' }, [
          el('button', { className: 'btn btn-sm btn-primary', onClick: () => editUsuario(u) }, 'Perfil'),
          u.id !== authUser?.id ? el('button', { className: 'btn btn-sm btn-danger', onClick: () => deleteUsuario(u.id) }, 'Deletar') : el('span', { className: 'text-xs', style: { color: '#999' } }, 'Você'),
        ]),
      ]);
      tbody.append(tr);
    }
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty">Erro: ${e.message}</td></tr>`;
  }
}

function editUsuario(u) {
  const perfis = ['USUARIO', 'ADMIN', 'REDATOR'];
  const form = el('div', { className: 'form-grid' }, [
    el('div', { className: 'full' }, [el('label', {}, `Alterar perfil de ${u.name}`), el('select', { id: 'f-user-perfil' },
      perfis.map(p => el('option', { value: p, selected: p === u.perfil }, p))
    )]),
  ]);
  showModal(`Editar Usuário #${u.id}`, form, async () => {
    await api(`/usuarios/${u.id}/perfil`, {
      method: 'PATCH',
      body: JSON.stringify({ perfil: $('#f-user-perfil').value }),
    });
    // Se mudou o próprio perfil, atualiza o user na sessão
    if (u.id === authUser?.id) {
      authUser.perfil = $('#f-user-perfil').value;
      localStorage.setItem('dev_user', JSON.stringify(authUser));
      $('#user-perfil').textContent = authUser.perfil;
    }
    loadUsuarios();
  });
}

async function deleteUsuario(id) {
  if (!confirm(`Deletar usuário #${id} permanentemente?`)) return;
  try {
    await api(`/usuarios/${id}`, { method: 'DELETE' });
    loadUsuarios();
  } catch (e) { showMessage(e.message); }
}

// ---------------------------------------
// HELPERS
// ---------------------------------------
function formatDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

function toDatetimeLocal(d) {
  if (!d) return '';
  const date = new Date(d);
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// ---------------------------------------
// CADASTRO DIRETO DO FRONT-DEV
// ---------------------------------------
function showCadastroForm() {
  const form = el('div', { className: 'form-grid' }, [
    el('div', { className: 'full' }, [el('label', {}, 'Nome completo'), el('input', { type: 'text', id: 'f-cad-nome', required: true, placeholder: 'Seu nome' })]),
    el('div', {}, [el('label', {}, 'CPF'), el('input', { type: 'text', id: 'f-cad-cpf', required: true, placeholder: '000.000.000-00' })]),
    el('div', {}, [el('label', {}, 'Telefone'), el('input', { type: 'text', id: 'f-cad-telefone', required: true, placeholder: '(53) 99999-9999' })]),
    el('div', { className: 'full' }, [el('label', {}, 'E-mail'), el('input', { type: 'email', id: 'f-cad-email', placeholder: 'opcional@email.com' })]),
    el('div', { className: 'full' }, [el('label', {}, 'Senha'), el('input', { type: 'password', id: 'f-cad-senha', required: true, minlength: '6', placeholder: 'Mínimo 6 caracteres' })]),
  ]);

  const modal = showModal('Criar Novo Usuário', form, async () => {
    await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: $('#f-cad-nome').value,
        cpf: $('#f-cad-cpf').value,
        telefone: $('#f-cad-telefone').value,
        email: $('#f-cad-email').value || undefined,
        senha: $('#f-cad-senha').value,
      }),
    });
    showMessage('Usuário cadastrado com sucesso! Faça login.', 'success');
  });
  modal.btnConfirm.textContent = 'Cadastrar';
}

// ---------------------------------------
// NAVEGAÇÃO
// ---------------------------------------
function initNavigation() {
  const hash = window.location.hash.slice(1) || 'passeios';
  navigateTo(hash);

  // Hash change
  window.addEventListener('hashchange', () => {
    const p = window.location.hash.slice(1) || 'passeios';
    navigateTo(p);
  });
}

// ---------------------------------------
// INIT
// ---------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  $('#login-form').addEventListener('submit', doLogin);
  $('#logout-btn').addEventListener('click', doLogout);
  $('#btn-show-cadastro')?.addEventListener('click', showCadastroForm);
  checkAuth();
  initNavigation();

  // Recarrega dados ao trocar de página
  const pageLoaders = {
    passeios: loadPasseios,
    clientes: loadClientes,
    agendamentos: loadAgendamentos,
    avaliacoes: loadAvaliacoes,
    usuarios: loadUsuarios,
  };

  // Intercepta navegação pra recarregar dados
  $$('.sidebar a[data-page]').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const page = a.dataset.page;
      navigateTo(page);
      if (pageLoaders[page]) pageLoaders[page]();
    });
  });

  // Botões "Novo"
  $('#btn-new-passeio')?.addEventListener('click', openNewPasseio);
  $('#btn-new-cliente')?.addEventListener('click', openNewCliente);
  $('#btn-new-agendamento')?.addEventListener('click', openNewAgendamento);
  $('#btn-new-avaliacao')?.addEventListener('click', openNewAvaliacao);

  // Se já logado, carrega página inicial
  if (authToken) loadPasseios();
});
