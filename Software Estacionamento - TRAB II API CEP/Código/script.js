/* =========================================================
   ParkFlow — lógica de cadastro e visualização (client-side)
   Estado mantido apenas em memória, sem backend.
   ========================================================= */

(function () {
  "use strict";

  // Estado inicial do pátio: 12 vagas em duas fileiras (A e B)
  const vagas = [
    { id: "A1", status: "ocupada", placa: "RJU4G21", modelo: "Fiat Argo",     tipo: "Carro", entrada: "08:12" },
    { id: "A2", status: "livre" },
    { id: "A3", status: "ocupada", placa: "BRA2E19", modelo: "Honda CG 160", tipo: "Moto",  entrada: "08:40" },
    { id: "A4", status: "livre" },
    { id: "A5", status: "livre" },
    { id: "A6", status: "ocupada", placa: "PXL9J03", modelo: "Jeep Renegade",tipo: "Caminhonete / SUV", entrada: "09:05" },
    { id: "B1", status: "livre" },
    { id: "B2", status: "livre" },
    { id: "B3", status: "ocupada", placa: "QWE5T88", modelo: "VW Gol",       tipo: "Carro", entrada: "09:20" },
    { id: "B4", status: "livre" },
    { id: "B5", status: "livre" },
    { id: "B6", status: "livre" },
  ];

  const rotulosTipo = {
    carro: "Carro",
    moto: "Moto",
    suv: "Caminhonete / SUV",
  };

  const form = document.getElementById("form-entrada");
  const campoVaga = document.getElementById("vaga");
  const corpoTabela = document.getElementById("corpo-tabela-vagas");
  const mensagemStatus = document.getElementById("mensagem-status");
  const statTotal = document.getElementById("stat-total");
  const statLivres = document.getElementById("stat-livres");
  const statOcupadas = document.getElementById("stat-ocupadas");

  const campoCep = document.getElementById("cep");
  const campoRua = document.getElementById("rua");
  const campoNumero = document.getElementById("numero");
  const campoCidade = document.getElementById("cidade");
  const cepStatus = document.getElementById("cep-status");
  const cepSpinner = document.getElementById("cep-spinner");

  /* ---------- Busca de endereço por CEP (API ViaCEP) ---------- */

  function formatarCep(valor) {
    const digitos = valor.replace(/\D/g, "").slice(0, 8);
    if (digitos.length > 5) {
      return `${digitos.slice(0, 5)}-${digitos.slice(5)}`;
    }
    return digitos;
  }

  function definirStatusCep(texto, tipo) {
    cepStatus.textContent = texto;
    cepStatus.dataset.tipo = tipo || "";
  }

  function marcarPreenchimentoAutomatico(campo, valor) {
    campo.value = valor;
    campo.dataset.preenchido = "auto";
  }

  async function buscarEnderecoPorCep(cepDigitado) {
    const cepLimpo = cepDigitado.replace(/\D/g, "");

    if (cepLimpo.length !== 8) {
      return;
    }

    cepSpinner.hidden = false;
    campoCep.setAttribute("aria-busy", "true");
    definirStatusCep("Buscando endereço...", "");

    try {
      const resposta = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);

      if (!resposta.ok) {
        throw new Error("Falha na comunicação com o serviço de CEP.");
      }

      const dados = await resposta.json();

      if (dados.erro) {
        definirStatusCep("CEP não encontrado. Preencha o endereço manualmente.", "erro");
        campoRua.focus();
        return;
      }

      marcarPreenchimentoAutomatico(campoRua, dados.logradouro || "");
      marcarPreenchimentoAutomatico(
        campoCidade,
        dados.localidade ? `${dados.localidade}${dados.uf ? " - " + dados.uf : ""}` : ""
      );

      definirStatusCep("Endereço encontrado automaticamente.", "sucesso");
      campoNumero.focus();
    } catch (erro) {
      definirStatusCep("Não foi possível buscar o CEP agora. Preencha o endereço manualmente.", "erro");
    } finally {
      cepSpinner.hidden = true;
      campoCep.removeAttribute("aria-busy");
    }
  }

  campoCep.addEventListener("input", function () {
    campoCep.value = formatarCep(campoCep.value);

    // Se o usuário editar o CEP, os campos deixam de ser "preenchidos automaticamente"
    delete campoRua.dataset.preenchido;
    delete campoCidade.dataset.preenchido;

    const digitos = campoCep.value.replace(/\D/g, "");
    if (digitos.length < 8) {
      definirStatusCep("Digite o CEP para buscar o endereço automaticamente.", "");
    }
  });

  campoCep.addEventListener("blur", function () {
    buscarEnderecoPorCep(campoCep.value);
  });

  campoCep.addEventListener("input", function () {
    const digitos = campoCep.value.replace(/\D/g, "");
    if (digitos.length === 8) {
      buscarEnderecoPorCep(campoCep.value);
    }
  });

  [campoRua, campoCidade].forEach((campo) => {
    campo.addEventListener("input", () => delete campo.dataset.preenchido);
  });

  function horarioAtual() {
    const agora = new Date();
    return agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }

  function atualizarResumo() {
    const livres = vagas.filter((v) => v.status === "livre").length;
    statTotal.textContent = vagas.length;
    statLivres.textContent = livres;
    statOcupadas.textContent = vagas.length - livres;
  }

  function atualizarOpcoesDeVaga() {
    const selecaoAnterior = campoVaga.value;
    campoVaga.innerHTML = "";

    const livres = vagas.filter((v) => v.status === "livre");

    if (livres.length === 0) {
      const opcao = document.createElement("option");
      opcao.textContent = "Nenhuma vaga livre no momento";
      opcao.value = "";
      campoVaga.appendChild(opcao);
      campoVaga.disabled = true;
      return;
    }

    campoVaga.disabled = false;
    livres.forEach((v) => {
      const opcao = document.createElement("option");
      opcao.value = v.id;
      opcao.textContent = `Vaga ${v.id}`;
      campoVaga.appendChild(opcao);
    });

    if (livres.some((v) => v.id === selecaoAnterior)) {
      campoVaga.value = selecaoAnterior;
    }
  }

  function criarLinha(vaga) {
    const linha = document.createElement("tr");
    const ocupada = vaga.status === "ocupada";

    linha.innerHTML = `
      <td data-coluna="vaga"><strong>${vaga.id}</strong></td>
      <td data-coluna="status">
        <span class="selo-status ${ocupada ? "selo-status--ocupada" : "selo-status--livre"}">
          ${ocupada ? "Ocupada" : "Livre"}
        </span>
      </td>
      <td data-coluna="placa">${ocupada ? vaga.placa : "—"}</td>
      <td data-coluna="modelo">${ocupada ? vaga.modelo : "—"}</td>
      <td data-coluna="tipo">${ocupada ? vaga.tipo : "—"}</td>
      <td data-coluna="entrada">${ocupada ? vaga.entrada : "—"}</td>
      <td data-coluna="acao"></td>
    `;

    if (ocupada) {
      const botao = document.createElement("button");
      botao.type = "button";
      botao.className = "botao-sair";
      botao.textContent = "Registrar saída";
      botao.setAttribute("aria-label", `Registrar saída do veículo na vaga ${vaga.id}`);
      botao.addEventListener("click", () => registrarSaida(vaga.id));
      linha.querySelector('[data-coluna="acao"]').appendChild(botao);
    }

    return linha;
  }

  function renderizarTabela() {
    corpoTabela.innerHTML = "";
    vagas.forEach((v) => corpoTabela.appendChild(criarLinha(v)));
  }

  function renderizarTudo() {
    renderizarTabela();
    atualizarResumo();
    atualizarOpcoesDeVaga();
  }

  function mostrarMensagem(texto, tipo) {
    mensagemStatus.textContent = texto;
    mensagemStatus.dataset.tipo = tipo;
  }

  function registrarSaida(idVaga) {
    const vaga = vagas.find((v) => v.id === idVaga);
    if (!vaga) return;

    const placaSaida = vaga.placa;
    vaga.status = "livre";
    delete vaga.placa;
    delete vaga.modelo;
    delete vaga.tipo;
    delete vaga.entrada;

    renderizarTudo();
    mostrarMensagem(`Saída registrada: veículo ${placaSaida} liberou a vaga ${idVaga}.`, "sucesso");
  }

  form.addEventListener("reset", function () {
    delete campoRua.dataset.preenchido;
    delete campoCidade.dataset.preenchido;
    cepSpinner.hidden = true;
    definirStatusCep("Digite o CEP para buscar o endereço automaticamente.", "");
  });

  form.addEventListener("submit", function (evento) {
    evento.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      mostrarMensagem("Verifique os campos obrigatórios antes de continuar.", "erro");
      return;
    }

    const dados = new FormData(form);
    const idVaga = dados.get("vaga");
    const vaga = vagas.find((v) => v.id === idVaga);

    if (!vaga || vaga.status === "ocupada") {
      mostrarMensagem("A vaga selecionada não está mais disponível. Escolha outra.", "erro");
      atualizarOpcoesDeVaga();
      return;
    }

    vaga.status = "ocupada";
    vaga.placa = dados.get("placa").toUpperCase();
    vaga.modelo = dados.get("modelo");
    vaga.tipo = rotulosTipo[dados.get("tipo")] || dados.get("tipo");
    vaga.entrada = horarioAtual();

    renderizarTudo();
    form.reset();
    mostrarMensagem(`Entrada registrada: ${vaga.placa} estacionado na vaga ${vaga.id}.`, "sucesso");
    document.getElementById("placa").focus();
  });

  renderizarTudo();
})();
