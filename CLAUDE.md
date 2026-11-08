## Code graph (graphify)

`graphify-out/` holds a map of this codebase: every file, function and class, how they connect, and named
groups of related code. Use it to find your way around before searching or reading source files. It
usually takes far fewer tokens.

- If the `graphify` command is missing, install it: `pip install 'graphifyy[leiden,sql]==0.9.103'`.
- For a question about the code, start with `graphify query "<question>"`. It returns the files and
  connections that matter. Use `graphify explain "<thing>"` for one concept and `graphify path "<A>" "<B>"`
  for how two things connect. Then read only the lines it pointed to.
- For an overview of the whole project, read `graphify-out/GRAPH_REPORT.md`.
- Never open `graphify-out/graph.json` or `graphify-out/graph.html` directly. Each is one huge line.
- Don't commit changes under `graphify-out/`. The Code graph workflow rebuilds it after each push to
  `main`, so pull before pushing again. To refresh it locally for queries, run `graphify update .`, then
  `git checkout graphify-out` before committing.
