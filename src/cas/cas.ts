export interface UseCas {
  parseExpression(
    value: any
  ): {
    getters: Set<string>;
    variables: Set<string>;
    parsedExpression: any;
  };
  calculateExpression(expressionData: CasExpressionData): void;
}

interface CasExpressionData {
  id: string;
  getterData: Map<string, any>;
  expression: any;
  /**
   * NOTE: This callback can be called multiple times
   * (like, when you have x*3=7^y --solve,y--> ... --expand--> ... --collect,x--> ...)
   */
  callback(
    variableResults: { name: string; data: any }[],
    resultingExpression: any
  ): void;
}

function parseExpression(value: any) {
  const getters = new Set<string>();
  const variables = new Set<string>();

  if (value[0] == "Equal" && !value[2]) {
    // Getter
    getters.add(value[1]);
  } else if (value[0] == "Assign") {
    // Variable
    variables.add(value[1]);
  }

  return {
    getters: getters,
    variables: variables,
    parsedExpression: value,
  };
}

export function useCas(): UseCas {
  //const cas = usePyodide(); // TODO: Use pyodide

  function calculateExpression(expressionData: CasExpressionData) {
    console.log(expressionData);

    // TODO: Remove this temporary hack
    if (expressionData.expression[0] == "Assign") {
      expressionData.callback(
        [
          {
            name: expressionData.expression[1],
            data: expressionData.expression[2],
          },
        ],
        expressionData.expression
      );
    } else {
      if (
        expressionData.expression[0] == "Equal" &&
        !expressionData.expression[2]
      ) {
        const result = expressionData.expression.slice();
        result[2] =
          expressionData.getterData.get(expressionData.expression[1]) ?? "CAT";
        expressionData.callback([], result);
      }
    }

    // TODO: Implement calculate expression (use a dummy for now, first check if the variables work, then implement the calculations)
  }

  return {
    calculateExpression,
    parseExpression,
  };
}
