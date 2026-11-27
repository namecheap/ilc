import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { JsonEditor } from './JsonEditor';

// The real editor is exercised by the specs of the pages. Here a double stands in for it,
// so that a spec can type as a user does and see what the wrapper asks of the editor
const { FakeJsonEditor, editors } = vi.hoisted(() => {
    interface Options {
        mode: string;
        onChange: () => void;
    }

    class FakeJsonEditor {
        text: string;
        updates: unknown[] = [];
        destroyed = false;
        // Only the "code" mode has an Ace editor
        aceEditor?: { maxLines?: number; setOptions(options: { maxLines: number }): void };

        constructor(
            public container: HTMLElement,
            public options: Options,
            json: unknown,
        ) {
            this.text = JSON.stringify(json);
            if (options.mode === 'code') {
                this.aceEditor = {
                    setOptions: ({ maxLines }) => {
                        this.aceEditor!.maxLines = maxLines;
                    },
                };
            }
            editors.push(this);
        }

        getText() {
            return this.text;
        }

        get() {
            return JSON.parse(this.text);
        }

        update(json: unknown) {
            this.updates.push(json);
            this.text = JSON.stringify(json);
        }

        destroy() {
            this.destroyed = true;
        }

        /** What a user does */
        type(text: string) {
            this.text = text;
            this.options.onChange();
        }
    }

    const editors: FakeJsonEditor[] = [];

    return { FakeJsonEditor, editors };
});

vi.mock('jsoneditor', () => ({ default: FakeJsonEditor }));

describe('JsonEditor', () => {
    beforeEach(() => {
        editors.length = 0;
    });

    it('shows the value it is given, compact at first', () => {
        const { container } = render(<JsonEditor mode="code" value={{ apiUrl: 'https://api.example.com' }} />);

        expect(editors).toHaveLength(1);
        expect(editors[0].container).toBe(container.firstChild);
        expect(editors[0].options.mode).toBe('code');
        expect(editors[0].get()).toEqual({ apiUrl: 'https://api.example.com' });
        expect(editors[0].aceEditor?.maxLines).toBe(15);
    });

    it('shows an empty object when there is no value', () => {
        render(<JsonEditor mode="code" value={null} />);

        expect(editors[0].get()).toEqual({});
    });

    it('shows a read-only tree, which has no Ace editor to size', () => {
        render(<JsonEditor mode="view" value={{ a: 1 }} />);

        expect(editors[0].options.mode).toBe('view');
        expect(editors[0].aceEditor).toBeUndefined();
    });

    it('reports the JSON a user enters and grows with it', () => {
        const onChange = vi.fn();
        render(<JsonEditor mode="code" value={{}} onChange={onChange} />);

        editors[0].type('{"a": 1}');

        expect(onChange).toHaveBeenLastCalledWith({ a: 1 });
        expect(editors[0].aceEditor?.maxLines).toBe(10000);
    });

    it('reports null when a user clears the editor', () => {
        const onChange = vi.fn();
        render(<JsonEditor mode="code" value={{ a: 1 }} onChange={onChange} />);

        editors[0].type('');

        expect(onChange).toHaveBeenLastCalledWith(null);
    });

    it('reports nothing while the text is not valid JSON', () => {
        const onChange = vi.fn();
        render(<JsonEditor mode="code" value={{}} onChange={onChange} />);

        editors[0].type('{"a": ');

        expect(onChange).not.toHaveBeenCalled();
    });

    it('calls the latest onChange it was given', () => {
        const first = vi.fn();
        const second = vi.fn();
        const { rerender } = render(<JsonEditor mode="code" value={{}} onChange={first} />);
        rerender(<JsonEditor mode="code" value={{}} onChange={second} />);

        editors[0].type('[]');

        expect(first).not.toHaveBeenCalled();
        expect(second).toHaveBeenCalledWith([]);
    });

    it('leaves the text alone when the form hands back a copy of what the user entered', () => {
        const { rerender } = render(<JsonEditor mode="code" value={{}} onChange={() => {}} />);
        editors[0].type('{"a":   1}');

        rerender(<JsonEditor mode="code" value={{ a: 1 }} onChange={() => {}} />);

        expect(editors[0].updates).toEqual([]);
        expect(editors[0].getText()).toBe('{"a":   1}');
    });

    it('follows a value that changes from outside, such as a record fetched again', () => {
        const { rerender } = render(<JsonEditor mode="code" value={{ a: 1 }} />);

        rerender(<JsonEditor mode="code" value={{ a: 2 }} />);
        rerender(<JsonEditor mode="code" value={undefined} />);

        expect(editors[0].updates).toEqual([{ a: 2 }, {}]);
        expect(editors).toHaveLength(1);
    });

    it('destroys the editor with the component', () => {
        const { unmount } = render(<JsonEditor mode="code" value={{}} />);

        unmount();

        expect(editors[0].destroyed).toBe(true);
    });

    it('builds a new editor for another mode, with the value it shows', () => {
        const { rerender } = render(<JsonEditor mode="view" value={{ a: 1 }} />);

        rerender(<JsonEditor mode="code" value={{ a: 1 }} />);

        expect(editors[0].destroyed).toBe(true);
        expect(editors[1].options.mode).toBe('code');
        expect(editors[1].get()).toEqual({ a: 1 });
    });
});
