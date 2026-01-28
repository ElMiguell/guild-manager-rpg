const DADOS_JOGO = {
  nomes: [
    "Arlan",
    "Borg",
    "Celia",
    "Draven",
    "Elowen",
    "Kyra",
    "Thane",
    "Zora",
  ],
  classes: [
    { tipo: "Guerreiro", poder: 10, taxaBase: 0.8, bonus: "Nenhum" },
    { tipo: "Ladino", poder: 7, taxaBase: 1.2, bonus: "Ouro Extra" },
    { tipo: "Clérigo", poder: 5, taxaBase: 1.0, bonus: "Cura" },
    // ADICIONE ESTAS:
    { tipo: "Mago", poder: 6, taxaBase: 1.5, bonus: "Dano em Área" },
    { tipo: "Arqueiro", poder: 8, taxaBase: 1.1, bonus: "Precisão" },
  ],
  ranks: [
    { nome: "Bronze", xpNecessaria: 0, bonusAtributo: 0 },
    { nome: "Ferro", xpNecessaria: 100, bonusAtributo: 2 },
    { nome: "Prata", xpNecessaria: 300, bonusAtributo: 3 },
    { nome: "Ouro", xpNecessaria: 800, bonusAtributo: 5 },
    { nome: "Platina", xpNecessaria: 2000, bonusAtributo: 8 },
  ],
  contratos: [
    {
      id: 1,
      nome: "Escoltar Caravana",
      rank: "Bronze",
      dificuldade: 15,
      recompensa: 50,
      tempo: 2,
      atributoChave: "resistencia",
    },
    {
      id: 2,
      nome: "Limpar Porões",
      rank: "Bronze",
      dificuldade: 12,
      recompensa: 40,
      tempo: 1,
      atributoChave: "forca",
    },
    {
      id: 3,
      nome: "Investigar Ruínas",
      rank: "Prata",
      dificuldade: 30,
      recompensa: 150,
      tempo: 3,
      atributoChave: "inteligencia",
    },
    // ... adicione atributoChave: "agilidade", "forca", "resistencia" ou "inteligencia" em todos.
  ],
};
