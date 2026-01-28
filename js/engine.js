function calcularResultadoMissao(poderGrupo, dificuldade) {
  const sorte = Math.floor(Math.random() * 16) - 5;
  const total = poderGrupo + sorte;
  if (total >= dificuldade) {
    return { sucesso: true, margem: total - dificuldade };
  } else {
    return { sucesso: false, margem: dificuldade - total };
  }
}

// js/engine.js

function gerarMercenarioAleatorio(nivelTaverna) {
  const nome =
    DADOS_JOGO.nomes[Math.floor(Math.random() * DADOS_JOGO.nomes.length)];
  const classeSorteada =
    DADOS_JOGO.classes[Math.floor(Math.random() * DADOS_JOGO.classes.length)];

  // Bônus baseado no nível da taverna
  const bonusNivel = nivelTaverna - 1;

  // Função auxiliar para rolar atributos (1 a 5) + bônus
  const rolar = () => Math.floor(Math.random() * 5) + 1 + bonusNivel;

  let atributos = {
    forca: rolar(),
    agilidade: rolar(),
    resistencia: rolar(),
    inteligencia: rolar(),
  };

  // APLICAR TENDÊNCIA DA CLASSE (Garantes que a classe seja boa no que faz)
  // Se for Guerreiro, garante que Força seja pelo menos 4 + bônus
  switch (classeSorteada.tipo) {
    case "Guerreiro":
      atributos.forca = Math.max(atributos.forca, 4 + bonusNivel);
      break;
    case "Mago":
      atributos.inteligencia = Math.max(atributos.inteligencia, 4 + bonusNivel);
      break;
    case "Ladino":
      atributos.agilidade = Math.max(atributos.agilidade, 4 + bonusNivel);
      break;
    case "Clérigo":
      atributos.resistencia = Math.max(atributos.resistencia, 4 + bonusNivel);
      break;
    case "Arqueiro":
      atributos.agilidade = Math.max(atributos.agilidade, 4 + bonusNivel);
      atributos.forca = Math.max(atributos.forca, 3 + bonusNivel);
      break;
  }

  const poderTotal =
    atributos.forca +
    atributos.agilidade +
    atributos.resistencia +
    atributos.inteligencia;

  return {
    nome: nome,
    classe: classeSorteada.tipo,
    atributos: atributos,
    poder: poderTotal,
    xp: 0,
    rank: "Bronze",
    status: "disponivel",
    custoContratacao: 15 + poderTotal * 2,
  };
}

function calcularCustoContratacao(mercenario) {
  const classeDados = DADOS_JOGO.classes.find(
    (c) => c.tipo === mercenario.classe,
  );
  return Math.floor(mercenario.poder * classeDados.taxaBase);
}

function processarEvolucao(mercenario, xpGanha) {
  mercenario.xp += xpGanha;

  // Encontra o maior rank que o XP atual permite
  const novoRankDados = [...DADOS_JOGO.ranks]
    .reverse()
    .find((r) => mercenario.xp >= r.xpNecessaria);

  if (novoRankDados && novoRankDados.nome !== mercenario.rank) {
    const antigoRank = mercenario.rank;
    mercenario.rank = novoRankDados.nome;

    // Bônus de evolução: aumenta todos os atributos!
    // Um rank novo dá um salto de qualidade real.
    const pontosGanhos = novoRankDados.bonusAtributo;

    mercenario.atributos.forca += pontosGanhos;
    mercenario.atributos.agilidade += pontosGanhos;
    mercenario.atributos.resistencia += pontosGanhos;
    mercenario.atributos.inteligencia += pontosGanhos;

    // Recalcula o poder total com os novos atributos
    mercenario.poder =
      mercenario.atributos.forca +
      mercenario.atributos.agilidade +
      mercenario.atributos.resistencia +
      mercenario.atributos.inteligencia;

    return true; // Subiu de nível!
  }
  return false;
}
