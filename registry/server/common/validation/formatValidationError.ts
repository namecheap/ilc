import type { z } from 'zod';

type Issue = z.core.$ZodIssue;

/**
 * Renders Zod issues with the wording Joi used, one message per line, so the 422 responses
 * the Admin UI and API clients read stay the same while schemas move from Joi to Zod.
 * Parse with `reportInput: true`: a missing value is told apart from a wrong one by the absent `input`.
 */
export function formatValidationError(error: z.ZodError): string {
    return error.issues.flatMap(formatIssue).join('\n');
}

function formatIssue(issue: Issue): string[] {
    const label = formatLabel(issue.path);

    switch (issue.code) {
        case 'invalid_type':
            return [formatInvalidType(label, issue)];
        case 'unrecognized_keys':
            return issue.keys.map((key) => `${formatLabel([...issue.path, key])} is not allowed`);
        case 'too_small':
            return [formatTooSmall(label, issue)];
        case 'too_big':
            return [formatTooBig(label, issue)];
        case 'invalid_value':
            return [`${label} must be ${issue.values.length === 1 ? '' : 'one of '}[${issue.values.join(', ')}]`];
        case 'invalid_format':
            return [formatInvalidFormat(label, issue)];
        default:
            // Custom checks carry a complete message, as getJoiErr messages did
            return [issue.message];
    }
}

function formatLabel(path: PropertyKey[]): string {
    if (path.length === 0) {
        return '"value"';
    }

    const rendered = path.reduce<string>((acc, segment) => {
        if (typeof segment === 'number') {
            return `${acc}[${segment}]`;
        }
        return acc ? `${acc}.${String(segment)}` : String(segment);
    }, '');

    return `"${rendered}"`;
}

function formatInvalidType(label: string, issue: z.core.$ZodIssueInvalidType): string {
    if (issue.input === undefined) {
        return issue.expected === 'never' ? `${label} is not allowed` : `${label} is required`;
    }

    switch (issue.expected) {
        case 'never':
            return `${label} is not allowed`;
        case 'object':
        case 'record':
            return `${label} must be of type object`;
        case 'array':
            return `${label} must be an array`;
        case 'string':
            return `${label} must be a string`;
        case 'number':
            return `${label} must be a number`;
        case 'int':
            return `${label} must be an integer`;
        case 'boolean':
            return `${label} must be a boolean`;
        default:
            return issue.message;
    }
}

function formatTooSmall(label: string, issue: z.core.$ZodIssueTooSmall): string {
    const limit = String(issue.minimum);

    if (issue.origin === 'string') {
        return issue.input === ''
            ? `${label} is not allowed to be empty`
            : `${label} length must be at least ${limit} characters long`;
    }
    if (issue.origin === 'array') {
        return `${label} must contain at least ${limit} items`;
    }
    if (issue.origin === 'number' && issue.minimum === 0 && !issue.inclusive) {
        return `${label} must be a positive number`;
    }
    return `${label} must be greater than or equal to ${limit}`;
}

function formatTooBig(label: string, issue: z.core.$ZodIssueTooBig): string {
    const limit = String(issue.maximum);

    if (issue.origin === 'string') {
        return `${label} length must be less than or equal to ${limit} characters long`;
    }
    if (issue.origin === 'array') {
        return `${label} must contain less than or equal to ${limit} items`;
    }
    return `${label} must be less than or equal to ${limit}`;
}

function formatInvalidFormat(label: string, issue: z.core.$ZodIssueInvalidStringFormat): string {
    if (issue.format === 'url') {
        return `${label} must be a valid uri`;
    }
    if (issue.format === 'regex' && 'pattern' in issue) {
        return `${label} with value "${String(issue.input)}" fails to match the required pattern: ${issue.pattern}`;
    }
    return issue.message;
}
