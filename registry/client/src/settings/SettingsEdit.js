import React, { cloneElement } from 'react';
import {  EditContextProvider } from 'react-admin';
import { Card, CardContent } from '@material-ui/core';
import { TitleForRecord } from 'ra-ui-materialui';
import{ useSettingsEditController } from './hooks/useSettingsEditController';

export const SettingsEdit = props => {

    const controllerProps = useSettingsEditController(props);

    const {
        basePath,
        defaultTitle,
        error,
        loaded,
        loading,
        record,
        redirect,
        resource,
        save,
        saving,
        version,
    } = controllerProps;

    if(loading) {
        return null;
    }

    return (
        <EditContextProvider value={props}>
            <div>
                {cloneElement(props.children, controllerProps)}
            </div>
        </EditContextProvider>
    );
}
