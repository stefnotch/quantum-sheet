# (Prototype) QuantumSheet

QuantumSheet - A web based computer algebra system aka fancy calculator

[**Try it out here**](https://stefnotch.github.io/quantum-sheet/)

![Screenshot](./screenshot.png)

## Looking for collaborators

I would really love to develop this project much further and am looking for collaborators. If you want to give it a shot, just respond here https://github.com/stefnotch/quantum-sheet/issues/14

## Roadmap

[Roadmap](https://github.com/stefnotch/quantum-sheet/projects)

## Used Technology

- [Sympy](https://github.com/sympy/sympy) using [Pyodide](https://github.com/iodide-project/pyodide)
<!-- - [Giac](https://www-fourier.ujf-grenoble.fr/~parisse/giac.html) using an [emgiac fork](https://github.com/brentan/emgiac) -->
<!-- - [Tiptap](https://github.com/scrumpy/tiptap) for text input -->
- [MathLive](https://github.com/arnog/mathlive) for mathematics input
<!-- - Plotting (with https://github.com/gl-vis/gl-plot3d ?) -->
- [Vite](https://github.com/vuejs/vite)

## For Developers

**Warning: The project currently depends on a patched version of mathlive that I haven't published.**

1. Clone the project
2. `npm install`
3. `npm run download:pyodide`
4. `npm run dev`

### Structure

- `src/ui/` contains the user interface code
- `src/model/` contains the logical part of the code
- `src/cas/` contains the computer algebra systems
