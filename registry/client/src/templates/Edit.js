import React, { useRef } from 'react';
import { Create, Edit, required, SimpleForm, TextField, TextInput, } from 'react-admin'; // eslint-disable-line import/no-unresolved
import Title from './Title';
import { TemplateLocaleTabs } from './components/TemplateLocaleTabs';
import { TabPanel } from './components/TabPanel';
import { Button } from '@material-ui/core';
import { Delete, Add } from '@material-ui/icons';
import { AddLocale } from './components/AddLocale';

class InputForm extends React.Component {
    state = {
        selectedTab: 0,
        addLocaleOpened: false,
        locales: Object.keys(this.props.record.localizedVersions || {})
    }

    currentLocales = this.state.locales;

    render() {
        let {mode, ...props} = this.props;
        const onLocaleAdded = (locale) => {
            const currentLocales = [...this.state.locales, locale];
            this.currentLocales = currentLocales;
            this.setState({ locales: currentLocales, addLocaleOpened: false });
        };

        const removeCurrentLocale = () => {
            if (this.state.selectedTab === 0) {
                return;
            }

            let currentLocale = this.state.locales[this.state.selectedTab - 1];
            const currentLocales = this.state.locales.filter(l => l !== currentLocale);
            this.setState({ locales: currentLocales, selectedTab: 0 });
            this.currentLocales = currentLocales;
        }

        return (<>
            <AddLocale open={this.state.addLocaleOpened} onLocaleAdded={onLocaleAdded} onCancel={() => this.setState({ addLocaleOpened: false }) }/>
            <SimpleForm {...props}>
                {mode === 'edit'
                    ? <TextField source="name"/>
                    : <TextInput source="name" fullWidth validate={required()}/>}
                <>
                    <Button startIcon={<Add/>} onClick={() => this.setState({ addLocaleOpened: true })}>Add Locale</Button>
                    <Button startIcon={<Delete/>} onClick={removeCurrentLocale} disabled={this.state.selectedTab === 0}>Remove
                        Current Locale</Button>
                </>
                <TemplateLocaleTabs locales={this.state.locales} onChange={(event, newValue) => this.setState({ selectedTab: newValue}) }
                                    value={this.state.selectedTab}/>
                <TabPanel value={0} selected={this.state.selectedTab}>
                    <TextInput source="content" multiline fullWidth/>
                </TabPanel>
                {this.state.locales.map((l, i) => (
                    <TabPanel value={i + 1} selected={this.state.selectedTab} key={i}>
                        <TextInput source={`localizedVersions.${l}.content`} label={`Content for ${l} language`}
                                   multiline
                                   fullWidth/>
                    </TabPanel>))}
            </SimpleForm>
        </>);
    }
}

InputForm.defaultProps = {mode: 'edit'}

export const TemplateEdit = ({permissions, ...props}) => {
    const inputRef = useRef(null);

    const transform = data => {
        // This workaround to non-ability to remove properties from object using react-admin
        // Using ref here since it is the only way to get actual information (from the instance of component)
        // other ways, like having state and callback would not work, since closure will have last value of the last render, not actual one
        const currentLocales = inputRef.current.currentLocales;
        const localesToDelete = Object.keys(data.localizedVersions).filter(l => !currentLocales.includes(l));
        for (let i in localesToDelete) {
            const locale = localesToDelete[i];
            delete data.localizedVersions[locale];
        }

        return data;
    };

    return (
        <Edit title={<Title/>} undoable={false} transform={transform} {...props}>
            <InputForm mode="edit" ref={inputRef}/>
        </Edit>
    );
};

export const TemplateCreate = ({permissions, ...props}) => {
    return (
        <Create {...props}>
            <InputForm mode="create" />
        </Create>
    );
};
