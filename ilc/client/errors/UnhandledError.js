import { RuntimeError } from "./RuntimeError";

export class UnhandledError extends RuntimeError {
    name = 'UnhandledError';
}