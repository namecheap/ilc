import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
    Edit,
    SimpleForm,
    Toolbar,
    SaveButton,
    useGetOne,
    useDataProvider,
} from 'react-admin';

import dataProvider from '../dataProvider';
import * as validators from '../validators';
import Title from './Title';
import JsonField from '../JsonField/index';
import { Input } from './Input';
import { SettingsEdit } from './SettingsEdit';

const MyToolbar = (props) => {
    return (
        <Toolbar {...props}>
            <SaveButton />
        </Toolbar>
    );
};

const MyEdit = (props) => {

    return (
        <>
            <SettingsEdit {...props}  undoable={false}>
                <SimpleForm toolbar={<MyToolbar />}>
                    <Input />
                </SimpleForm>
            </SettingsEdit>
        </>
    );
};

export default MyEdit;
