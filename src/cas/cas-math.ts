export function getGetterNames(expression: any) {
  const getters = new Set<string>();

  if (!Array.isArray(expression)) {
    if (typeof expression == "string") {
      getters.add(expression);
    }
  } else {
    if (expression[0] == "Assign") {
      extractGetters(expression[2]);
    } else if (expression[0] == "Equal") {
      extractGetters(expression[1]);
    } else if (expression[0] == "To") {
      extractGetters(expression[1]);
    } else {
      extractGetters(expression);
    }

    function extractGetters(expression: any) {
      if (Array.isArray(expression)) {
        const functionName = expression[0];
        for (let i = 1; i < expression.length; i++) {
          extractGetters(expression[i]);
        }
      } else if (typeof expression === "string") {
        getters.add(expression);
      }
    }
  }

  return getters;
}

export function getVariableNames(expression: any) {
  const variables = new Set<string>();
  if (Array.isArray(expression) && expression[0] == "Assign") {
    // TODO: Handle variable arrays
    variables.add(expression[1]);
  }
  return variables;
}
