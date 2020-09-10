# Contributing Guide

Welcome, interested person! Contributions are welcome. If you're ever unsure, feel free to open an issue.

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





