type Grammar = {
  name: string;
  target: string; // nonterminal name
  nonterminals: { [name: string]: Phrase[] };
};

type Phrase = (string | RegExp)[];

class Parser {
  private grammar: Grammar;

  constructor(grammar: Grammar) {
    this.grammar = grammar;
  }

  parse(input: string): any {
    // This is a placeholder implementation
    // In a real parser, we would implement the parsing logic here
    console.log(`Parsing input: ${input}`);
    console.log(`Using grammar: ${this.grammar.name}`);
    return { success: true, ast: "Placeholder AST" };
  }
}

function generateParser(grammar: Grammar): Parser {
  return new Parser(grammar);
}

export { Grammar, Phrase, Parser, generateParser };
