import MathLive from "mathlive";

// TODO: Remove this hack
let dictionary = MathLive.DEFAULT_LATEX_DICTIONARY;
console.log(dictionary);
//@ts-ignore
dictionary["inequalities"].find((v) => v.name == "Equal").parse = function (
  lhs,
  scanner,
  minPrec,
  _latex
) {
  if (260 < minPrec) return [lhs, null];
  const rhs = scanner.matchExpression(260);
  if (rhs == null) return [null, ["Equal", lhs, null]];
  return [null, ["Equal", lhs, rhs]];
};
//@ts-ignore
dictionary["inequalities"].find((v) => v.name == "EqualEqual").precedence = 265;
//@ts-ignore
dictionary["algebra"][
  //@ts-ignore
  dictionary["algebra"].findIndex((v) => v.name == "To")
] = {
  emit: function (emitter, expr) {
    if (!Array.isArray(expr)) throw new Error("Expect array expression");

    return `${emitter.wrap(expr[1], 260)}\\xrightarrow{${
      Array.isArray(expr[2]) && expr[2][0] == "Missing"
        ? "\\placeholder{}"
        : expr[2]
    }}${emitter.wrap(expr[3], 260)}`;
  },
  precedence: 260,
  name: "To",
  optionalLatexArg: 1,
  requiredLatexArg: 1,
  parse: function (lhs, scanner, minPrec, _latex) {
    if (260 < minPrec) return [lhs, null];
    scanner.matchOptionalLatexArgument();
    //const solveArgument = scanner.matchRequiredLatexArgument(); // TODO: Add the solve keyword to known stuff
    let solveArgument = "";
    scanner.skipSpace();
    if (scanner.match("<{>")) {
      let level = 1;
      while (!scanner.atEnd() && level !== 0) {
        if (scanner.match("<{>")) {
          level += 1;
        } else if (scanner.match("<}>")) {
          level -= 1;
        } else if (scanner.match("<space>")) {
          solveArgument += " ";
        } else {
          solveArgument += scanner.next();
        }
      }
    }

    const rhs = scanner.matchExpression(260);
    return [
      null,
      [
        "To",
        lhs,
        solveArgument == "\\placeholder" ? ["Missing", ""] : solveArgument,
        rhs,
      ],
    ];
  },
  trigger: { infix: "\\xrightarrow" },
};
//@ts-ignore
dictionary["core"].push({
  name: "\\text",
  parse: "\\text",
  emit: function (emitter, expr) {
    if (!Array.isArray(expr)) throw new Error("Expect array expression");
    return `\\text{${expr[1]}}`;
  },
});

export const something = 1;
