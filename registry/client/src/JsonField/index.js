import React, { useState } from "react";

import {
    FieldTitle,
    useInput
} from 'react-admin';

import Typography from "@material-ui/core/Typography";
import {JsonEditor} from "jsoneditor-react";
import './editor.css';

import ace from "brace";
import 'brace/mode/json';
import 'brace/theme/github';

export default ({
   label,
   source,
   resource,
   ...rest
}) => {
    const {
        input: {onChange: inputOnChange, value},
        isRequired,
        //meta: { error, touched },
    } = useInput({
        resource,
        source,
        ...rest,
    });

    const [oldJson, setOldJson] = useState({});
    const [jsonEditorRef, setJsonEditorRef] = useState(null);
    const [autoHeight, setAutoHeight] = useState(false);

    let jsonVal = {};
    try {
        jsonVal = JSON.parse(value)
    } catch (e) {}

    if (JSON.stringify(oldJson) !== JSON.stringify(jsonVal) && jsonEditorRef) {
        setOldJson(jsonVal);
        jsonEditorRef.set(jsonVal);
    }

    const style = {height: '400px'};

    const setRef = instance => {
        if (instance) {
            setJsonEditorRef(instance.jsonEditor);
        } else {
            setJsonEditorRef(null);
        }
    };

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
                ref={setRef}
                style={style}
                mode="code"
                value={jsonVal}
                ace={ace}
                onChange={value => { // Here we receive only valid values
                    inputOnChange(JSON.stringify(value));
                    if (jsonEditorRef && !autoHeight) {
                        jsonEditorRef.aceEditor.setOptions({
                            maxLines: 10000
                        });
                        setAutoHeight(true)
                    }
                }}
            />
        </div>

    );
};
