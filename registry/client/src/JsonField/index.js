import React, {
    useState,
    useCallback,
    useRef,
} from "react";

import {
    FieldTitle,
    useInput
} from 'react-admin';

import Typography from "@material-ui/core/Typography";
import {JsonEditor} from "jsoneditor-react";

import ace from "brace";
import 'brace/mode/json';

const style = {height: '300px'};

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
        } else {
            jsonEditorRef.current = null;
        }
    });
    const [autoHeight, setAutoHeight] = useState(false);

    let jsonVal = {};
    try {
        jsonVal = JSON.parse(value)
    } catch (e) {}

    return (
        <div>
            <Typography component="h4">
                <FieldTitle
                    label={label}
                    source={source}
                    resource={resource}
                    isRequired={isRequired}
                />
            </Typography>

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
        </div>

    );
};
