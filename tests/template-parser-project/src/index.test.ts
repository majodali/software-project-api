import { Grammar, generateParser } from './index';

describe('Parser Generator', () => {
  const calcGrammar: Grammar = {
    name: "CalculatorGrammar",
    target: "Expression",
    nonterminals: {
      Expression: [
        ["Expression", "Operator", "Expression"],
        ["(", "Expression", ")"],
        ["Number"]
      ],
      Operator: [[/[-+*/^]/]],
      Number: [[/[0-9]+(\.[0-9]+)?/]]
    }
  };

  it('should generate a parser from a grammar', () => {
    const parser = generateParser(calcGrammar);
    expect(parser).toBeDefined();
    expect(parser.parse).toBeInstanceOf(Function);
  });

  it('should parse a simple expression', () => {
    const parser = generateParser(calcGrammar);
    const result = parser.parse('2 + 3');
    expect(result.success).toBe(true);
  });

  // Add more tests as needed
});
