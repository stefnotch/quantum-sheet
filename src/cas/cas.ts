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

  const variableMatches = (value + "").match(/^([^\\]+)\\coloneq([^]+)$/);
  if (variableMatches) {
    variables.add(variableMatches[1]);
  }

  const getterMatches = (value + "").match(/^([^\\]+)=$/);
  if (getterMatches) {
    getters.add(getterMatches[1]);
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
    const variableMatches = (expressionData.expression + "").match(
      /^([^\\]+)\\coloneq([^]+)$/
    );
    if (variableMatches) {
      expressionData.callback(
        [
          {
            name: variableMatches[1],
            data: variableMatches[2],
          },
        ],
        expressionData.expression
      );
    } else {
      const getterMatches = (expressionData.expression + "").match(
        /^([^\\]+)=$/
      );
      if (getterMatches) {
        expressionData.callback(
          [],
          expressionData.expression +
            expressionData.getterData.get(getterMatches[1])
        );
      }
    }

    // TODO: Implement calculate expression (use a dummy for now, first check if the variables work, then implement the calculations)
  }

  return {
    calculateExpression,
    parseExpression,
  };
}
