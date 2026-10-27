import path from 'node:path';

// node-config reads its folder when it is first imported. The compiled server and the Knex CLI, which runs from the
// knexfile folder, load the compiled config next to this file, so nothing needs a TypeScript loader at runtime.
// A module of its own because imports are evaluated before the code of the module that imports them.
process.env.NODE_CONFIG_DIR ??= path.resolve(__dirname);
