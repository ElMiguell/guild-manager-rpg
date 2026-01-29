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
  const ouroEl = document.getElementById("ouro");
  ouroEl.innerText = estado.ouro;

  // Fica vermelho se estiver com pouco dinheiro (ex: menos de 20 G)
  if (estado.ouro < 20) {
    ouroEl.style.color = "#ff4d4d"; // Vermelho alerta
  } else {
    ouroEl.style.color = "#ffd700"; // Dourado padrão
  }
  document.getElementById("dia").innerText = estado.dia;
  document.getElementById("lvl-taverna").innerText = estado.nivelTaverna;
  document.getElementById("vagas-ocupadas").innerText =
    estado.mercenarios.length;
  document.getElementById("vagas-totais").innerText = estado.limiteMercenários;

  // Localiza o botão e calcula o custo
  const btnUpgrade = document.getElementById("btn-upgrade");
  const custoUpgrade = obterCustoUpgradeTaverna(estado.nivelTaverna);

  // Atualiza o texto do botão
  btnUpgrade.innerText = `Melhorar Taverna (${custoUpgrade} G)`;

  // Lógica de desativar o botão se não houver ouro suficiente
  if (estado.ouro < custoUpgrade) {
    btnUpgrade.disabled = true;
    btnUpgrade.classList.replace("btn-primary", "btn-secondary"); // Troca azul por cinza (se usar Bootstrap)
    btnUpgrade.style.opacity = "0.6"; // Garante o efeito visual mesmo sem Bootstrap
    btnUpgrade.style.cursor = "not-allowed";
  } else {
    btnUpgrade.disabled = false;
    btnUpgrade.classList.replace("btn-secondary", "btn-primary");
    btnUpgrade.style.opacity = "1";
    btnUpgrade.style.cursor = "pointer";
  }

  // 2. Renderizar Mercenários usando TEMPLATE
  const listaM = document.getElementById("lista-mercenarios");
  listaM.className = "row g-3";
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

  // 3. Renderizar Missões (Quadro Único Ordenado)
  const containerGeral = document.getElementById("container-lista-missoes");
  const tplMissao = document.getElementById("tpl-missao");

  if (containerGeral) {
    containerGeral.innerHTML = ""; // Limpa o quadro único

    // Criamos uma cópia de todos os contratos para não alterar os dados originais
    const todasMissoes = [...DADOS_JOGO.contratos];

    // Ordena por dificuldade (Menor para Maior)
    todasMissoes.sort((a, b) => a.dificuldade - b.dificuldade);

    todasMissoes.forEach((c) => {
      const clone = tplMissao.content.cloneNode(true);

      // Preenchimento dos dados do card
      clone.querySelector(".missao-nome").innerText = c.nome;
      clone.querySelector(".missao-rec").innerText = `${c.recompensa} Ouro`;
      clone.querySelector(".missao-tempo").innerText = c.tempo;

      // Estilização visual da Dificuldade baseada no Rank original
      const difEl = clone.querySelector(".missao-dif");
      difEl.innerText = `Dif: ${c.dificuldade}`;

      // Cores baseadas no Rank para manter a identidade visual
      const cores = {
        Bronze: "#cd7f32",
        Ferro: "#a5a5a5",
        Prata: "#c0c0c0",
        Ouro: "#ffd700",
      };
      difEl.style.color = cores[c.rank] || "#fff";
      difEl.style.borderColor = cores[c.rank] || "#fff";

      // Lógica de designação de equipe (Mantida do seu original)
      const ordemRanks = ["Bronze", "Ferro", "Prata", "Ouro", "Platina"];
      const nivelMissao = ordemRanks.indexOf(c.rank);
      const containerGrupo = clone.querySelector(".missao-grupo-selecao");

      estado.mercenarios.forEach((m, idx) => {
        if (m.status === "disponivel") {
          const label = document.createElement("label");
          label.className = "btn btn-sm btn-outline-secondary m-1";
          const isBloqueado = ordemRanks.indexOf(m.rank) < nivelMissao;

          label.innerHTML = `
                    <input type="checkbox" class="me-1 m-check" 
                           value="${idx}" 
                           data-contrato="${c.id}" 
                           ${isBloqueado ? "disabled" : ""}>
                    ${m.nome}
                `;

          label.querySelector("input").onchange = () =>
            mostrarPreviaMissao(c.id);
          containerGrupo.appendChild(label);
        }
      });

      clone.querySelector(".missao-previa").id = `previa-${c.id}`;
      clone.querySelector(".btn-enviar").onclick = () =>
        enviarMissaoDireta(c.id);

      containerGeral.appendChild(clone);
    });
  }

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
  divTaverna.className = "row g-3";
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

function mostrarPreviaMissao(idContrato) {
  const previa = document.getElementById(`previa-${idContrato}`);
  const contrato = DADOS_JOGO.contratos.find((c) => c.id === idContrato);

  // PEGA OS CHECKBOXES MARCADOS PARA ESTA MISSÃO
  const selecionadosIndices = Array.from(
    document.querySelectorAll(
      `.m-check[data-contrato="${idContrato}"]:checked`,
    ),
  ).map((cb) => parseInt(cb.value));

  const selecionados = selecionadosIndices.map(
    (idx) => estado.mercenarios[idx],
  );

  if (selecionados.length === 0) {
    previa.innerHTML = "Sucesso: 0% | Custo: 0 G";
    return;
  }

  const calculo = calcularChanceSucessoMelhorada(idContrato, selecionados);
  const custoTotal = selecionados.reduce(
    (sum, m) => sum + calcularCustoContratacao(m),
    0,
  );

  const corBarra =
    calculo.chance > 70
      ? "bg-success"
      : calculo.chance > 40
        ? "bg-warning"
        : "bg-danger";

  previa.innerHTML = `
    <div class="mt-2">
        <small class="d-flex justify-content-between">
            <span>Chance de Sucesso:</span>
            <b>${calculo.chance}%</b>
        </small>
        <div class="progress" style="height: 10px;">
            <div class="progress-bar ${corBarra}" style="width: ${calculo.chance}%"></div>
        </div>
        <div class="text-muted mt-1 small">
            Suprimentos: <span class="text-warning">${Math.floor(contrato.recompensa * 0.15)} G</span> | 
            Salários: <span class="text-warning">${custoTotal} G</span>
        </div>
    </div>
  `;
}

function enviarMissaoDireta(idContrato) {
  const contrato = DADOS_JOGO.contratos.find((c) => c.id === idContrato);

  // NOVA FORMA DE PEGAR OS SELECIONADOS
  const selecionadosIndices = Array.from(
    document.querySelectorAll(
      `.m-check[data-contrato="${idContrato}"]:checked`,
    ),
  ).map((cb) => parseInt(cb.value));

  if (selecionadosIndices.length === 0) {
    return log("Selecione ao menos um mercenário!");
  }

  const grupo = selecionadosIndices.map((idx) => estado.mercenarios[idx]);

  // Cálculo de custos
  const salariosGrupo = grupo.reduce(
    (sum, m) => sum + calcularCustoContratacao(m),
    0,
  );
  const custoSuprimentos = Math.floor(contrato.recompensa * 0.15);
  const custoTotal = salariosGrupo + custoSuprimentos;

  if (estado.ouro < custoTotal) {
    return log(`Ouro insuficiente! Você precisa de ${custoTotal} G.`, "alerta");
  }

  estado.ouro -= custoTotal;
  grupo.forEach((m) => (m.status = "em missão"));

  estado.missoesAtivas.push({
    ...contrato,
    grupo: grupo,
    tempoRestante: contrato.tempo,
  });

  log(`Expedição lançada: ${contrato.nome}.`, "info");
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
        lucroFinal = missao.recompensa;
        estado.ouro += lucroFinal;
        log(`SUCESSO: ${missao.nome}! Recebemos ${lucroFinal} G.`, "sucesso");

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
  const custo = obterCustoUpgradeTaverna(estado.nivelTaverna);
  if (estado.ouro >= custo) {
    estado.ouro -= custo;
    estado.nivelTaverna++;
    log(`Taverna expandida para o Nível ${estado.nivelTaverna}!`, "sucesso");
    atualizarUI();
  } else {
    log("Ouro insuficiente para a reforma.", "alerta");
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

function navegar(idTela) {
  // 1. Esconder todas as telas
  const telas = document.querySelectorAll(".tela-conteudo");
  telas.forEach((tela) => {
    tela.style.display = "none";
    // Removemos a animação para poder reiniciá-la
    tela.style.animation = "none";
  });

  // 2. Mostrar a tela desejada
  const telaAlvo = document.getElementById(`tela-${idTela}`);
  if (telaAlvo) {
    telaAlvo.style.display = "block";
    // Forçamos o navegador a reconhecer a nova animação (truque de reflow)
    void telaAlvo.offsetWidth;
    telaAlvo.style.animation = "fadeIn 0.4s ease-in-out";
  }

  // 3. Atualizar a aparência dos botões (feedback visual)
  document
    .querySelectorAll(".btn-nav")
    .forEach((btn) => btn.classList.remove("ativo"));
  document.getElementById(`btn-${idTela}`).classList.add("ativo");

  // 4. Salvar qual era a última tela aberta (Opcional)
  estado.ultimaTela = idTela;
  salvarJogo();
}

carregarJogo(); // Tenta carregar antes de gerar novos candidatos
if (estado.candidatosDoDia.length === 0) gerarCandidatosDoDia();
atualizarUI();
