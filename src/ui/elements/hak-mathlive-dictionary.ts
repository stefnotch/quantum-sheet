import {Expression, LatexSyntax} from "@cortex-js/compute-engine";
import { Scanner } from "@cortex-js/compute-engine/dist/types/latex-syntax/public";

// https://github.com/cortex-js/compute-engine/blob/680462ea46b9d5c4c53d046d807bd9eeab4b853c/src/latex-syntax/definitions-arithmetic.ts
// TODO: Remove this hack
/*
> I haven't had the chance to document  the custom parsers yet (but that's the intent at some point). 
  Note that rather than the quite clever `dictionary.find((v) => v.name == "Equal").parse = ` 
  I would recommend that you pass a custom `FunctionDefinition` to the `dictionary` argument of `new LatexSyntax()`. 
> Anyway, the tuple returned by the parse function is `[remainder, result]`. 
  In other words, you would return something else than `null` if you had not been able to parse some or all of it 
  (like `return [lhs, null]` which basically says: "I wasn't able to consume any of it").
> That said, with the default parser, if you enter `x =` you will get back `["Equal", "x", "Missing"]`. 
  The `"Missing"` symbol indicates... er... that something is missing when there is a "mandatory" argument.
> --@ arnog
*/
let dictionary = LatexSyntax.getDictionary();
console.log(dictionary);
//@ts-ignore
/*dictionary.find((v) => v.name == "Equal").parse = function (
  lhs: Expression,
  scanner: Scanner,
  minPrec: number
): [Expression | null, Expression | null] {
  if (260 < minPrec) return [lhs, null];
  //if (lhs === null) return [null, null]; // TODO: This is a dirty hack
  
  const index = scanner.index;
  const rhs = scanner.matchExpression(lhs === null ? 400 : 260);
  if (rhs == null) {
    scanner.index = index;
    return [null, ["Equal", lhs, "Missing"]];
  }
  return [null, ["Equal", lhs, rhs]];
};*/
//@ts-ignore
dictionary.find((v) => v.name == "EqualEqual").precedence = 265;
//@ts-ignore
dictionary[
  //@ts-ignore
  dictionary.findIndex((v) => v.name == "To")
] = {
  serialize: function (emitter, expr) {
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
dictionary.push({
  name: "\\text",
  parse: "\\text",
  serialize: function (emitter, expr) {
    if (!Array.isArray(expr)) throw new Error("Expect array expression");
    return `\\text{${expr[1]}}`;
  },
});



export const something = dictionary;
