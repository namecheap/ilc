# ILC Registry

## Quick start in dev mode

This will use SQLite database as default one, located in `server/dbfiles`

```bash
$ npm install
$ npm run migrate
$ npm run seed
$ npm run dev
```

And then browse to [http://localhost:4001/](http://localhost:4001/).

The default credentials are:
**root / pwd** - for admin access.
**readonly / pwd** - for read only access.

## Use MySQL as database

1. Copy `.env.example` to `.env` in the `registry` directory
2. Set `DB_CLIENT` to `mysql`
3. Ensure mysql service is up by running `docker compose up mysql` in the root folder
4. Start application with

```bash
$ npm install
$ npm run migrate
$ npm run seed
$ npm run dev
```

## Use PostgreSQL as database

1. Copy `.env.example` to `.env` in the `registry` directory
2. Set `DB_CLIENT` to `pg`
3. Ensure mysql service is up by running `docker compose up postgres` in the root folder
4. Start application with

```bash
$ npm install
$ npm run migrate
$ npm run seed
$ npm run dev
```

## Return database to a clean state

```bash
$ npm run reset
```

## Run tests in the SQLite database

This command ignores `.env` file

```bash
$ npm run test
```

## Run tests in the MySQL database

Assuming database is up via docker-compose  
This command ignores `.env` file

```bash
$ npm run test:mysql
```

## Run tests in the PostgreSQL database

Assuming database is up via docker-compose  
This command ignores `.env` file

```bash
$ npm run test:postgres
```
