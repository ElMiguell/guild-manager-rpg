let estado = {
  ouro: 100,
  dia: 1,
  mercenarios: [],
  missoesAtivas: [],
  candidatosDoDia: [],
  limiteMercenários: 5,
  nivelTaverna: 1,
  tempoReal: false,
  timer: null,
  historicoMissoes: [],
  logs: [],
};

function atualizarUI() {
  // 1. Recursos Básicos (Direto ao ponto)
  document.getElementById("ouro").innerText = estado.ouro;
  document.getElementById("dia").innerText = estado.dia;
  document.getElementById("lvl-taverna").innerText = estado.nivelTaverna;
  document.getElementById("vagas-ocupadas").innerText =
    estado.mercenarios.length;
  document.getElementById("vagas-totais").innerText = estado.limiteMercenários;
  document.getElementById("btn-upgrade").innerText =
    `Melhorar Taverna (${estado.nivelTaverna * 50} Ouro)`;

  // 2. Renderizar Mercenários usando TEMPLATE
  const listaM = document.getElementById("lista-mercenarios");
  const tplM = document.getElementById("tpl-mercenario");
  listaM.innerHTML = ""; // Limpa a lista

  estado.mercenarios.forEach((m, index) => {
    const clone = tplM.content.cloneNode(true);

    // Status simplificados para uso na lógica
    const emMissao = m.status === "em missão";
    const ferido = m.status === "ferido";

    // Dados Básicos
    clone.querySelector(".m-nome").innerText = m.nome;
    clone.querySelector(".m-classe").innerText = m.classe;
    clone.querySelector(".m-rank").innerText = m.rank;

    // Atributos Detalhados
    clone.querySelector(".m-str").innerText = m.atributos.forca;
    clone.querySelector(".m-agi").innerText = m.atributos.agilidade;
    clone.querySelector(".m-end").innerText = m.atributos.resistencia;
    clone.querySelector(".m-int").innerText = m.atributos.inteligencia;

    // Lógica de XP
    const indexRankAtual = DADOS_JOGO.ranks.findIndex((r) => r.nome === m.rank);
    const rankProximo = DADOS_JOGO.ranks[indexRankAtual + 1];

    let porcentagemXP = 100;
    let xpTexto = "MAX";

    if (rankProximo) {
      const xpNoRankAtual =
        m.xp - DADOS_JOGO.ranks[indexRankAtual].xpNecessaria;
      const xpNecessariaParaProximo =
        rankProximo.xpNecessaria -
        DADOS_JOGO.ranks[indexRankAtual].xpNecessaria;

      porcentagemXP = Math.min(
        (xpNoRankAtual / xpNecessariaParaProximo) * 100,
        100,
      );
      xpTexto = `${m.xp} / ${rankProximo.xpNecessaria}`;
    }

    clone.querySelector(".m-xp-barra").style.width = `${porcentagemXP}%`;
    clone.querySelector(".m-xp-texto").innerText = xpTexto;

    // Lógica Visual de Status
    const statusEl = clone.querySelector(".m-status");
    statusEl.innerText = m.status.toUpperCase();

    // Aplicação de cores baseada no estado
    if (emMissao) {
      statusEl.className = "text-danger m-status";
    } else if (ferido) {
      statusEl.className = "text-warning m-status";
      // Opcional: mostrar dias restantes de ferimento
      statusEl.innerText += ` (${m.diasRecuperacao}D)`;
    } else {
      statusEl.className = "text-success m-status";
    }

    // Botão Dispensar
    const btnDisp = clone.querySelector(".btn-dispensar");
    btnDisp.onclick = () => dispensarMercenario(index);

    // Bloqueia dispensa se não estiver disponível
    if (emMissao || ferido) {
      btnDisp.disabled = true;
    }

    listaM.appendChild(clone);
  });

  // 3. Renderizar Missões usando TEMPLATE
  const tplMissao = document.getElementById("tpl-missao");
  ["Bronze", "Prata", "Ouro"].forEach((rank) => {
    const container = document.getElementById(`rank-${rank.toLowerCase()}`);
    if (!container) return;
    container.innerHTML = "";

    DADOS_JOGO.contratos
      .filter((c) => c.rank === rank)
      .forEach((c) => {
        const clone = tplMissao.content.cloneNode(true);

        clone.querySelector(".missao-nome").innerText = c.nome;
        clone.querySelector(".missao-dif").innerText = `Dif: ${c.dificuldade}`;
        clone.querySelector(".missao-rec").innerText = `${c.recompensa} Ouro`;
        clone.querySelector(".missao-tempo").innerText = c.tempo;

        const select = clone.querySelector(".missao-select");
        select.id = `sel-${c.id}`;
        select.onchange = () => mostrarPreviaMissao(c.id, c.dificuldade);

        const ordemRanks = ["Bronze", "Ferro", "Prata", "Ouro", "Platina"];
        const nivelMissao = ordemRanks.indexOf(c.rank);

        estado.mercenarios.forEach((m, idx) => {
          // Só aparecem se estiverem disponíveis (feridos e em missão ficam de fora)
          if (m.status === "disponivel") {
            const opt = document.createElement("option");
            opt.value = idx;

            const nivelMercenario = ordemRanks.indexOf(m.rank);

            if (nivelMercenario < nivelMissao) {
              opt.text = `[BLOQUEADO] ${m.nome} (Rank ${m.rank})`;
              opt.disabled = true; // Impede a seleção
            } else {
              opt.text = `${m.nome} (Poder: ${m.poder})`;
            }
            select.appendChild(opt);
          }
        });

        clone.querySelector(".missao-previa").id = `previa-${c.id}`;
        clone.querySelector(".missao-previa").innerHTML =
          "Sucesso: 0% | Custo: 0 G";
        clone.querySelector(".btn-enviar").onclick = () =>
          enviarMissaoDireta(c.id);

        container.appendChild(clone);
      });
  });

  // 4. Missões Ativas
  const listaAtivas = document.getElementById("missoes-ativas");
  const tplAtiva = document.getElementById("tpl-ativa");
  listaAtivas.innerHTML = "";

  estado.missoesAtivas.forEach((m) => {
    const clone = tplAtiva.content.cloneNode(true);

    clone.querySelector(".a-nome").innerText = m.nome;
    clone.querySelector(".a-tempo").innerText = `${m.tempoRestante} dias`;

    // Cálculo da barra de progresso
    const progresso = ((m.tempo - m.tempoRestante) / m.tempo) * 100;
    clone.querySelector(".a-barra").style.width = `${progresso}%`;

    listaAtivas.appendChild(clone);
  });

  // 5. Candidatos na Taverna
  const divTaverna = document.getElementById("taverna-candidatos");
  const tplCandidato = document.getElementById("tpl-candidato");
  divTaverna.innerHTML = "";

  if (estado.candidatosDoDia.length === 0) {
    divTaverna.innerHTML =
      "<small class='text-muted'>Sem candidatos hoje.</small>";
  } else {
    estado.candidatosDoDia.forEach((c, i) => {
      const clone = tplCandidato.content.cloneNode(true);

      // Dados Básicos
      clone.querySelector(".c-nome").innerText = c.nome;
      clone.querySelector(".c-classe").innerText = c.classe;
      clone.querySelector(".c-poder").innerText = c.poder;

      // Atributos (Puxando do objeto 'atributos' criado no engine.js)
      clone.querySelector(".c-str").innerText = c.atributos.forca;
      clone.querySelector(".c-agi").innerText = c.atributos.agilidade;
      clone.querySelector(".c-end").innerText = c.atributos.resistencia;
      clone.querySelector(".c-int").innerText = c.atributos.inteligencia;

      // Botão de Contratação
      const btn = clone.querySelector(".c-btn-contratar");
      btn.innerText = `Contratar (${c.custoContratacao} G)`;
      btn.onclick = () => contratarMercenario(i);

      divTaverna.appendChild(clone);
    });
  }

  // 6. Renderizar Histórico
  const listaH = document.getElementById("lista-historico");
  const tplH = document.getElementById("tpl-historico");
  document.getElementById("total-missoes").innerText =
    `Total: ${estado.historicoMissoes.length}`;
  listaH.innerHTML = "";

  if (estado.historicoMissoes.length === 0) {
    listaH.innerHTML =
      "<small class='text-muted p-2 d-block'>Nenhuma missão concluída ainda.</small>";
  } else {
    estado.historicoMissoes.forEach((h) => {
      const clone = tplH.content.cloneNode(true);

      clone.querySelector(".h-nome").innerText = `[Dia ${h.dia}] ${h.nome}`;
      clone.querySelector(".h-grupo").innerText = `Grupo: ${h.nomesGrupo}`;

      const resEl = clone.querySelector(".h-resultado");
      resEl.innerText = h.resultado;
      resEl.classList.add(
        h.resultado === "SUCESSO" ? "bg-success" : "bg-danger",
      );

      const lucroEl = clone.querySelector(".h-lucro");
      lucroEl.innerText = h.lucro > 0 ? `+${h.lucro} G` : "--";
      if (h.lucro === 0)
        lucroEl.classList.replace("text-success", "text-muted");

      listaH.appendChild(clone);
    });
  }
}

function mostrarPreviaMissao(idContrato, dificuldade) {
  const select = document.getElementById(`sel-${idContrato}`);
  const previa = document.getElementById(`previa-${idContrato}`);
  const contrato = DADOS_JOGO.contratos.find((c) => c.id === idContrato);

  const selecionados = Array.from(select.selectedOptions).map(
    (opt) => estado.mercenarios[opt.value],
  );

  const ordemRanks = ["Bronze", "Ferro", "Prata", "Ouro", "Platina"];
  const nivelExigido = ordemRanks.indexOf(contrato.rank);
  const grupoInvalido = selecionados.some(
    (m) => ordemRanks.indexOf(m.rank) < nivelExigido,
  );

  if (grupoInvalido) {
    previa.innerHTML = `<span class="text-danger fw-bold">Rank Insuficiente!</span>`;
    return;
  }

  const calculo = calcularChanceSucessoMelhorada(idContrato, selecionados);
  const custoTotal = selecionados.reduce(
    (sum, m) => sum + calcularCustoContratacao(m),
    0,
  );

  const cor =
    calculo.chance > 75
      ? "text-success"
      : calculo.chance > 45
        ? "text-warning"
        : "text-danger";

  // Tradução simples para o display
  const nomesAtributos = {
    forca: "STR",
    agilidade: "AGI",
    resistencia: "END",
    inteligencia: "INT",
  };
  const labelAtributo = nomesAtributos[contrato.atributoChave];

  previa.innerHTML = `
        <span class="${cor} fw-bold">Sucesso: ${calculo.chance}%</span> | 
        <b>Custo: ${custoTotal} G</b><br>
        <small class="text-info">Foco em ${labelAtributo} detectado!</small>
    `;
}

function enviarMissaoDireta(idContrato) {
  const contrato = DADOS_JOGO.contratos.find((c) => c.id === idContrato);
  const select = document.getElementById(`sel-${idContrato}`);

  const selecionadosIndices = Array.from(select.selectedOptions).map((opt) =>
    parseInt(opt.value),
  );

  if (selecionadosIndices.length === 0) {
    return log("Selecione ao menos um mercenário!");
  }

  const grupo = selecionadosIndices.map((idx) => estado.mercenarios[idx]);

  // --- NOVA VERIFICAÇÃO DE RANK ---
  const ordemRanks = ["Bronze", "Ferro", "Prata", "Ouro", "Platina"];
  const nivelExigido = ordemRanks.indexOf(contrato.rank);

  const grupoInadequado = grupo.some(
    (m) => ordemRanks.indexOf(m.rank) < nivelExigido,
  );

  if (grupoInadequado) {
    return log(
      `Missão negada: Este contrato de rank ${contrato.rank} exige veteranos experientes!`,
      "alerta",
    );
  }
  const custoDoGrupo = grupo.reduce(
    (sum, m) => sum + calcularCustoContratacao(m),
    0,
  );
  if (estado.ouro < custoDoGrupo) {
    return log(
      `Ouro insuficiente! Você precisa de ${custoDoGrupo} G para suprimentos.`,
    );
  }
  estado.ouro -= custoDoGrupo;
  grupo.forEach((m) => (m.status = "em missão"));
  estado.missoesAtivas.push({
    ...contrato,
    grupo: grupo,
    poderTotal: grupo.reduce((sum, m) => sum + m.poder, 0),
    tempoRestante: contrato.tempo,
  });
  log(
    `Expedição lançada: ${contrato.nome}. Boa sorte aos ${grupo.length} mercenários!`,
  );
  salvarJogo();
  atualizarUI();
}

function contratarMercenario(index) {
  if (index === undefined) return;
  const candidato = estado.candidatosDoDia[index];
  if (!candidato) return;
  if (estado.mercenarios.length >= estado.limiteMercenários) {
    log("Guilda cheia! Aumente o alojamento ou dispense alguém.");
    return;
  }
  if (estado.ouro < candidato.custoContratacao) {
    log("Ouro insuficiente.");
    return;
  }
  estado.ouro -= candidato.custoContratacao;
  estado.mercenarios.push(candidato);
  estado.candidatosDoDia.splice(index, 1);
  log(`Contratado: ${candidato.nome}`);
  salvarJogo();
  atualizarUI();
}

function dispensarMercenario(index) {
  const merc = estado.mercenarios[index];

  // Impedir dispensa de quem está trabalhando
  if (merc.status === "em missão") {
    log(
      `Não podemos dispensar ${merc.nome} enquanto ele estiver em missão!`,
      "alerta",
    );
    return;
  }

  // Confirmação para evitar cliques acidentais
  if (confirm(`Deseja realmente dispensar ${merc.nome}?`)) {
    estado.mercenarios.splice(index, 1);
    log(`${merc.nome} deixou a guilda.`, "info");
    salvarJogo();
    atualizarUI(); // Recarrega a tela para atualizar os índices
  }
}

function iniciarMissao(idContrato) {
  const contrato = DADOS_JOGO.contratos.find((c) => c.id === idContrato);
  const selecionadosIndices = Array.from(
    document.querySelectorAll('input[type="checkbox"]:checked'),
  ).map((cb) => parseInt(cb.value));
  if (selecionadosIndices.length === 0) return log("Selecione mercenários!");
  let custoDoGrupo = 0;
  const grupo = selecionadosIndices.map((index) => {
    const m = estado.mercenarios[index];
    custoDoGrupo += calcularCustoContratacao(m);
    return m;
  });
  if (estado.ouro < custoDoGrupo) {
    log(`Ouro insuficiente! Você precisa de ${custoDoGrupo}.`);
    return;
  }
  estado.ouro -= custoDoGrupo;
  log(`Missão iniciada: ${contrato.nome}. Gastos: ${custoDoGrupo} ouro.`);
  grupo.forEach((m) => (m.status = "em missão"));
  estado.missoesAtivas.push({
    ...contrato,
    grupo: grupo,
    poderTotal: grupo.reduce((sum, m) => sum + m.poder, 0),
    tempoRestante: contrato.tempo,
  });
  atualizarUI();
}

function calcularChanceSucessoMelhorada(idContrato, grupo) {
  const contrato = DADOS_JOGO.contratos.find((c) => c.id === idContrato);
  if (!grupo || grupo.length === 0) return 0;

  const poderBruto = grupo.reduce((sum, m) => sum + m.poder, 0);

  // SOMA DO ATRIBUTO ESPECÍFICO:
  // Ex: Se a missão pede 'forca', somamos a força de todos os membros.
  const somaAtributoChave = grupo.reduce(
    (sum, m) => sum + (m.atributos[contrato.atributoChave] || 0),
    0,
  );

  // BÔNUS: Cada ponto no atributo chave vale como 1.5 pontos de poder extra
  const poderEfetivo = poderBruto + somaAtributoChave * 0.5;

  let chance = Math.min(
    Math.floor((poderEfetivo / contrato.dificuldade) * 100),
    98,
  ); // Cap de 98%
  return {
    chance,
    poderEfetivo,
    bonus: somaAtributoChave > 0,
    tipoAtributo: contrato.atributoChave,
  };
}

function passarTempo(dias) {
  estado.dia += dias;

  const missoesRestantes = [];

  // 1. Lógica de Recuperação (Curar quem já estava ferido)
  estado.mercenarios.forEach((m) => {
    if (m.status === "ferido") {
      m.diasRecuperacao -= dias;
      if (m.diasRecuperacao <= 0) {
        m.status = "disponivel";
        m.diasRecuperacao = 0;
        log(`${m.nome} se recuperou e está pronto para o combate!`, "info");
      }
    }
  });

  estado.missoesAtivas.forEach((missao) => {
    missao.tempoRestante -= dias;

    if (missao.tempoRestante <= 0) {
      const calculoFinal = calcularChanceSucessoMelhorada(
        missao.id,
        missao.grupo,
      );
      const dado = Math.random() * 100;
      const sucesso = dado <= calculoFinal.chance;
      let lucroFinal = 0;

      if (sucesso) {
        // --- SUCESSO ---
        lucroFinal = Math.floor(missao.recompensa * 0.2);
        estado.ouro += lucroFinal;
        log(`SUCESSO: ${missao.nome}! Lucro: ${lucroFinal}`, "sucesso");

        missao.grupo.forEach((m) => {
          const xpGanha = Math.floor(missao.dificuldade * 0.5);
          if (processarEvolucao(m, xpGanha)) {
            log(`UPGRADE: ${m.nome} agora é Rank ${m.rank}!`, "sucesso");
          }
          // LIBERAÇÃO: No sucesso, todos voltam disponíveis
          m.status = "disponivel";
        });
      } else {
        // --- FALHA (Lógica de Resistência Adicionada Aqui) ---
        log(`FALHA: O grupo falhou em ${missao.nome}.`, "erro");

        missao.grupo.forEach((m) => {
          const sorteioResistencia =
            Math.random() * 20 + m.atributos.resistencia;

          if (sorteioResistencia < 15) {
            m.status = "ferido";
            m.diasRecuperacao = 1;
            log(`${m.nome} se feriu na retirada.`, "alerta");
          } else {
            m.status = "disponivel";
            log(`${m.nome} resistiu aos ferimentos da derrota.`, "info");
          }
        });
      }

      // 2. Histórico
      estado.historicoMissoes.unshift({
        nome: missao.nome,
        resultado: sucesso ? "SUCESSO" : "FALHA",
        lucro: lucroFinal,
        nomesGrupo: missao.grupo.map((m) => m.nome).join(", "),
        dia: estado.dia,
      });

      if (estado.historicoMissoes.length > 20) estado.historicoMissoes.pop();

      // O PONTO 4 ANTIGO FOI REMOVIDO DAQUI PORQUE A LIBERAÇÃO JÁ OCORRE ACIMA
    } else {
      missoesRestantes.push(missao);
    }
  });

  estado.missoesAtivas = missoesRestantes;
  gerarCandidatosDoDia();
  salvarJogo();
  atualizarUI();
}

function gerarCandidatosDoDia() {
  estado.candidatosDoDia = [];
  for (let i = 0; i < 3; i++) {
    estado.candidatosDoDia.push(gerarMercenarioAleatorio(estado.nivelTaverna));
  }
}

function renovarCandidatos() {
  const custoReroll = 10; // Valor fixo ou poderia subir com o nível da taverna

  if (estado.ouro >= custoReroll) {
    estado.ouro -= custoReroll;
    gerarCandidatosDoDia(); // Reutiliza sua função existente
    log(
      `Você pagou ${custoReroll} G para atrair novos recrutas para a taverna.`,
      "info",
    );

    salvarJogo(); // Salva o novo estado dos candidatos
    atualizarUI(); // Renderiza a lista nova
  } else {
    log("Ouro insuficiente para procurar novos recrutas!", "alerta");
  }
}

function melhorarTaverna() {
  const custo = estado.nivelTaverna * 50;
  if (estado.ouro >= custo) {
    estado.ouro -= custo;
    estado.nivelTaverna++;
    log(`Taverna Nível ${estado.nivelTaverna}!`);
    salvarJogo();
    atualizarUI();
  } else {
    log("Ouro insuficiente.");
  }
}

function avancarTurno() {
  if (!estado.tempoReal) passarTempo(1);
}

function alternarTempoReal() {
  estado.tempoReal = !estado.tempoReal;
  const btn = document.getElementById("btn-tempo");
  if (estado.tempoReal) {
    btn.innerText = "Pausar Tempo Real";
    estado.timer = setInterval(() => passarTempo(1), 3000);
  } else {
    btn.innerText = "Ativar Tempo Real";
    clearInterval(estado.timer);
  }
}

function log(msg, tipo = "info") {
  // 1. Salva o log no objeto estado para persistência
  const novoLog = { msg, tipo, dia: estado.dia };
  estado.logs.unshift(novoLog); // Adiciona no início da array

  // Mantém apenas os últimos 30 logs no estado
  if (estado.logs.length > 30) {
    estado.logs.pop();
  }

  // 2. Renderiza na tela (Chamamos a UI para desenhar)
  renderizarLogs();

  // Como o log mudou o estado, aproveitamos para salvar
  salvarJogo();
}

function renderizarLogs() {
  const container = document.getElementById("log");
  const tpl = document.getElementById("tpl-log");
  if (!container || !tpl) return;

  container.innerHTML = ""; // Limpa para desenhar a lista atualizada

  estado.logs.forEach((item) => {
    const clone = tpl.content.cloneNode(true);

    clone.querySelector(".l-data").innerText = `Dia ${item.dia} - Registro #`;
    clone.querySelector(".l-texto").innerText = item.msg;

    const entrada = clone.querySelector(".log-entry");
    switch (item.tipo) {
      case "sucesso":
        entrada.classList.add("border-success");
        break;
      case "erro":
        entrada.classList.add("border-danger");
        break;
      case "alerta":
        entrada.classList.add("border-warning");
        break;
      default:
        entrada.classList.add("border-info");
        break;
    }

    container.appendChild(clone); // Adiciona na ordem da array
  });
}

// --- SISTEMA DE SAVE ---

function salvarJogo() {
  localStorage.setItem("guild_manager_save", JSON.stringify(estado));
}

function carregarJogo() {
  const save = localStorage.getItem("guild_manager_save");
  if (save) {
    try {
      const dadosCarregados = JSON.parse(save);
      estado = { ...estado, ...dadosCarregados };

      // Se o save for antigo e não tiver a array de logs, criamos uma vazia
      if (!estado.logs) estado.logs = [];

      renderizarLogs(); // Desenha os logs recuperados
      log("Progresso carregado automaticamente.", "info");
    } catch (e) {
      console.error(e);
    }
  }
}

// Exporta um arquivo .json para o computador do usuário
function exportarSave() {
  const dataStr =
    "data:text/json;charset=utf-8," +
    encodeURIComponent(JSON.stringify(estado));
  const downloadAnchorNode = document.createElement("a");
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute(
    "download",
    `guild_save_dia_${estado.dia}.json`,
  );
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
  log("Arquivo de save gerado com sucesso!", "sucesso");
}

// Importa um arquivo .json selecionado pelo usuário
function importarSave(event) {
  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const dados = JSON.parse(e.target.result);
      estado = dados;
      salvarJogo(); // Salva no localStorage o novo estado importado
      location.reload(); // Recarrega a página para aplicar tudo
    } catch (err) {
      alert("Arquivo de save inválido!");
    }
  };
  reader.readAsText(event.target.files[0]);
}

function resetarJogo() {
  if (confirm("Tem certeza? Isso apagará toda a sua guilda permanentemente!")) {
    localStorage.removeItem("guild_manager_save");
    location.reload();
  }
}

carregarJogo(); // Tenta carregar antes de gerar novos candidatos
if (estado.candidatosDoDia.length === 0) gerarCandidatosDoDia();
atualizarUI();
