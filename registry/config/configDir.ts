import path from 'node:path';

// Knex CLI runs from the knexfile folder, node-config reads the folder when it is first imported.
// A module of its own because imports are evaluated before the code of the module that imports them.
process.env.NODE_CONFIG_DIR = path.resolve(__dirname);
