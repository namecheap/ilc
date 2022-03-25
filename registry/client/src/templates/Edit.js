import React, { useState } from 'react';
import { Create, Edit, required, SimpleForm, TextField, TextInput, } from 'react-admin'; // eslint-disable-line import/no-unresolved
import Title from './Title';
import { TemplateLocaleTabs } from './components/TemplateLocaleTabs';
import { TabPanel } from './components/TabPanel';
import { Button } from '@material-ui/core';
import { Delete, Add } from '@material-ui/icons';
import { AddLocale } from './components/AddLocale';

const InputForm = ({mode = 'edit', ...props}) => {
    const [selectedTab, setTabValue] = useState(0);
    const [addLocaleOpened, setAddLocaleOpened] = useState(false);
    const [locales, setLocales] = useState([]);
    const onLocaleAdded = (locale) => {
        setLocales([...locales, locale]);
        setAddLocaleOpened(false)
    };

    const removeCurrentLocale = () => {
        if (selectedTab === 0) {
            return;
        }

        let currentLocale = locales[selectedTab - 1];
        if (props.record.localizedVersions && props.record.localizedVersions[currentLocale]) {
            delete props.record.localizedVersions[currentLocale];
        }

        setTabValue(0);
        setLocales(locales.filter(l => l !== currentLocale));
    }

    return (<>
        <AddLocale open={addLocaleOpened} onLocaleAdded={onLocaleAdded} onCancel={() => setAddLocaleOpened(false)}/>
        <SimpleForm {...props}>
            {mode === 'edit'
                ? <TextField source="name"/>
                : <TextInput source="name" fullWidth validate={required()}/>}
            <>
                <Button startIcon={<Add/>} onClick={() => setAddLocaleOpened(true)}>Add Locale</Button>
                <Button startIcon={<Delete/>} onClick={removeCurrentLocale} disabled={selectedTab === 0}>Remove Current Locale</Button>
            </>
            <TemplateLocaleTabs locales={locales} onChange={(event, newValue) => setTabValue(newValue)}
                                value={selectedTab}/>
            <TabPanel value={0} selected={selectedTab}>
                <TextInput source="content" multiline fullWidth/>
            </TabPanel>
            {locales.map((l, i) => (
                <TabPanel value={i + 1} selected={selectedTab} key={i}>
                    <TextInput source={`localizedVersions.${l}.content`} label={`Content for ${l} language`} multiline
                               fullWidth/>
                </TabPanel>))}
        </SimpleForm>
    </>);
};

export const TemplateEdit = ({permissions, ...props}) => (
    <Edit title={<Title/>} undoable={false} {...props}>
        <InputForm mode="edit"/>
    </Edit>
);

export const TemplateCreate = ({permissions, ...props}) => {
    return (
        <Create {...props}>
            <InputForm mode="create"/>
        </Create>
    );
};
