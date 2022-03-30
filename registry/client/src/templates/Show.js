import React, { useState } from 'react';
import { Show, SimpleShowLayout, TextField } from 'react-admin'; // eslint-disable-line import/no-unresolved
import Title from './Title';
import { ShowTopToolbar } from '../components';
import { TemplateLocaleTabs } from './components/TemplateLocaleTabs';
import { TabPanel } from './components/TabPanel';

function ViewOfTemplate({...props}) {
    const [tabValue, setTabValue] = useState(0);
    // You might wondering why || {} is needed
    // So I'll explain
    // react-admin that is used here uses very "nice" approach of rendering show view
    // when you come from the list, it assumes that resource is ready to render and basically renders with the record fetched from the list
    // I don't know how, but they didn't think that list resource MIGHT BE DIFFERENT FROM the whole resource that is returned during getOne
    // fortunately - they still make HTTP request to refresh the record
    // so all you need - is to pretend that life is normal and the record is full (even if it is not)
    // to wait for the whole record
    // and of course there is no property to understand that record is loaded
    // so you just fake it... till react-admin make it
    // if you know how to disable "optimistic" view, please do it
    const locales = Object.keys(props.record.localizedVersions || {});
    return <>
        <SimpleShowLayout {...props} toolbar={null}>
            <TextField source="name"/>

            <TemplateLocaleTabs value={tabValue} onChange={(event, newValue) => setTabValue(newValue)}
                                locales={locales}/>}/>

            <TabPanel selected={tabValue} value={0}>
                <TextField source="content" component="pre"/>
            </TabPanel>
            {locales.map((locale, i) => (
                <TabPanel selected={tabValue} value={i + 1} key={locale}>
                    <TextField source={`localizedVersions.${locale}.content`} component={'pre'} />
                </TabPanel>
            ))}
        </SimpleShowLayout>
    </>;
}

export default ({permissions, hasList, hasEdit, hasShow, hasCreate, ...props}) => {
    return (
        <Show title={<Title/>} {...props} actions={<ShowTopToolbar/>}>
            <ViewOfTemplate {...props} />
        </Show>
    );
};
