# Contributing Guide

Welcome, interested person! Contributions are welcome. If you're ever unsure, feel free to open an issue. Also, [check out the roadmap](https://github.com/stefnotch/quantum-sheet/projects/1).

Preferably, features are developed in another branch or fork. After the feature is ready, a pull request to the master branch should be opened.



## Setup
1. Clone the project
2. `npm install`
3. `npm run download:pyodide`
4. `npm run dev`



## Tooling

I recommend using [Visual Studio Code](https://code.visualstudio.com/) with 
- [Prettier Extension](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) to format your files
- Settings &rarr; Format On Save &rarr; Enable (`"editor.formatOnSave": true,`)
- [Vetur Extension](https://marketplace.visualstudio.com/items?itemName=octref.vetur) for Vue.js
- [(optional)npm Extension](https://marketplace.visualstudio.com/items?itemName=eg2.vscode-npm-script)
- [(optional)TODO Highlight Extension](https://marketplace.visualstudio.com/items?itemName=wayou.vscode-todo-highlight)

### Code Structure

- `src/ui/` contains the user interface code
- `src/model/` contains the logical part of the code
- `src/cas/` contains the computer algebra systems



## High-Level Documentation

### Important Terms

- CAS: Computer Algebra System, this is a piece of magic that takes formulas or equations and evaluates them
- MathJson: [A format](https://cortexjs.io/math-json/) to unambiguously represent mathematical expressions
- Document: A document consists of a number of elements such as
  - Mathematical Expressions
  - Scopes
  - Text Blocks



### Design

- Equation Editor (frontend)
  - We're using mathlive, however other equation editors could also be used
  - Every equation editor has a corresponding element in the document
  - During typing, the backend can optionally be asked to
    - Return the variables (values, functions, units) that are in scope
    - Quickly evaluate the expression
    - Suggest autocompletions
    - Return information about expressions, such as 'variable $a$ is a vector' or 'the $\cdot$ sign here stands for dot product'
  - When the user hits Enter (submit), then
    - The expression gets parsed and turned into MathJson
      - Placeholders get added where the result should go
    - The expression gets sent to the backend
    - Eventually, the result gets returned
- Backend
  - A general backend that doesn't know how to evaluate expressions. Instead, it keeps track of the entire document, including
    - Expressions
    - Scopes
    - Imports
    - Variables
- CAS
  - We're using Sympy, however support for more computer algebra systems is planned
  - The CAS accepts commands
    - id: Every command has an ID to identify it
    - expression: Every command has some expression to evaluate
    - gettersData: When an expression contains some variables, they will be included here
    - callback: A function to call when the result is ready. Can be called multiple times, to return partial results
  - It translates the MathJson expression into something the CAS understands (e.g. Sympy-Python Code)
  - Then evaluates the expression (e.g. in a web worker)
  - And finally, converts the result back to MathJson (e.g. A sympy printer)

