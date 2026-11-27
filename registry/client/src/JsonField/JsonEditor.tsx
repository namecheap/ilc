import JSONEditor from 'jsoneditor';
import 'jsoneditor/dist/jsoneditor.css';
import { useEffect, useRef } from 'react';

// The editor starts compact and grows with its content once the user edits it
const INITIAL_MAX_LINES = 15;
const EDITED_MAX_LINES = 10000;

interface JsonEditorProps {
    /** "code" is the Ace text editor, "view" is a read-only tree */
    mode: 'code' | 'view';
    /** Any JSON value, nothing is shown as an empty object */
    value: unknown;
    /** Gets every valid JSON value the user enters, and null for an empty editor */
    onChange?: (value: unknown) => void;
}

/** Only the "code" mode has an Ace editor, whatever the typings say */
function setMaxLines(editor: JSONEditor, maxLines: number) {
    const aceEditor: JSONEditor['aceEditor'] | undefined = editor.aceEditor;
    aceEditor?.setOptions({ maxLines });
}

function isSameJson(a: unknown, b: unknown) {
    return a === b || JSON.stringify(a) === JSON.stringify(b);
}

/**
 * React wrapper of https://github.com/josdejong/jsoneditor
 */
export function JsonEditor({ mode, value, onChange }: JsonEditorProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const editorRef = useRef<JSONEditor | null>(null);
    const onChangeRef = useRef(onChange);
    useEffect(() => {
        onChangeRef.current = onChange;
    });
    // The value the editor holds: the one it was given, or the one it reported last
    const shownValueRef = useRef(value);

    useEffect(() => {
        function report(json: unknown) {
            shownValueRef.current = json;
            onChangeRef.current?.(json);
        }

        const editor = new JSONEditor(
            containerRef.current!,
            {
                mode,
                onChange() {
                    setMaxLines(editor, EDITED_MAX_LINES);

                    if (editor.getText() === '') {
                        report(null);
                        return;
                    }

                    try {
                        report(editor.get());
                    } catch {
                        // The text is not valid JSON yet, the user is typing
                    }
                },
            },
            shownValueRef.current ?? {},
        );
        setMaxLines(editor, INITIAL_MAX_LINES);
        editorRef.current = editor;

        return () => {
            editor.destroy();
            editorRef.current = null;
        };
    }, [mode]);

    // Follows a value that changes from outside, such as a record that is fetched again. A value the editor
    // reported itself comes back as a copy, and is left alone so that the text the user types is not rewritten
    useEffect(() => {
        if (editorRef.current && !isSameJson(value, shownValueRef.current)) {
            shownValueRef.current = value;
            editorRef.current.update(value ?? {});
        }
    }, [value]);

    return <div ref={containerRef} />;
}
