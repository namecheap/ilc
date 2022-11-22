import React, {
    useState,
    useCallback,
    useRef,
} from "react";

import { useInput } from 'react-admin';

import {JsonEditor} from "jsoneditor-react";

import ace from "brace";
import 'brace/mode/json';
import { Labeled } from 'react-admin';
import { isPlainObject } from '../utils/json';


const style = { marginBottom: 22 };

export default ({
    label,
    source,
    resource,
    ...rest
}) => {
    const {
        input: {onChange: inputOnChange, value},
        isRequired,
    } = useInput({
        resource,
        source,
        ...rest,
    });

    const jsonEditorRef = useRef(null);
    const setJsonEditorRef = useCallback((node) => {
        if (node) {
            jsonEditorRef.current = node.jsonEditor;

            if (!initialHeight) {
                jsonEditorRef.current.aceEditor?.setOptions({
                    maxLines: 15
                });
            }
            setInitialHeight(true);
        } else {
            jsonEditorRef.current = null;
        }
    });
    const [autoHeight, setAutoHeight] = useState(false);
    const [initialHeight, setInitialHeight] = useState(false);

    let jsonVal = {};
    try {
        jsonVal = JSON.parse(value)
    } catch (e) {
        if(isPlainObject(value)) {
            jsonVal = value;
        }
    }

    return (
        <div>
            <Labeled label={label} isRequired={isRequired} fullWidth>
                <>
                    <JsonEditor
                        ref={setJsonEditorRef}
                        htmlElementProps={{ style }}
                        mode="code"
                        value={jsonVal}
                        ace={ace}
                        onChange={value => { // Here we receive only valid values
                            inputOnChange(JSON.stringify(value));
                            if (jsonEditorRef.current && !autoHeight) {
                                jsonEditorRef.current.aceEditor.setOptions({
                                    maxLines: 10000
                                });
                                setAutoHeight(true)
                            }
                        }}
                    />
                </>
            </Labeled>
        </div>

    );
};

export const JsonFieldShow = ({
    label,
    source,
    addLabel = true,
    record,
}) => {
    let jsonVal = {};
    if (record && record[source]) {
        try {
            jsonVal = JSON.parse(record[source])
        } catch (e) { }
    }

    const result = (
        <JsonEditor
            htmlElementProps={{ style }}
            mode="view"
            value={jsonVal}
            ace={ace}
        />
    );

    if (addLabel) {
        return (
            <div>
                <Labeled label={label} fullWidth>
                    <>{result}</>
                </Labeled>
            </div>
        );
    }

    return result
};
