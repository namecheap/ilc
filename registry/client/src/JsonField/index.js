import React from "react";

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
   onBlur,
   onChange,
   onFocus,
   parse,
   validate,
   ...rest
}) => {
    const {
        input: {onChange: inputOnChange, value},
        isRequired,
        //meta: { error, touched },
    } = useInput({
        onBlur,
        onChange,
        onFocus,
        parse,
        resource,
        source,
        validate,
        ...rest,
    });

    let jsonVal = {};
    try {
        jsonVal = JSON.parse(value)
    } catch (e) {}

    const style = {height: '400px'};

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
                style={style}
                mode="code"
                value={jsonVal}
                ace={ace}
                theme="ace/theme/github"
                onChange={value => { // Here we receive only valid values
                    inputOnChange(JSON.stringify(value))
                }}
            />
        </div>

    );
};
