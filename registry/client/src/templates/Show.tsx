import { CardContent } from '@mui/material';
import { useState } from 'react';
import { Show, SimpleShowLayout, TextField, useRecordContext } from 'react-admin';

import { ShowTopToolbar } from '../components';
import { TemplateLocaleTabs } from './components/TemplateLocaleTabs';
import { Title } from './Title';

function ViewOfTemplate() {
    const [tabValue, setTabValue] = useState(0);
    const record = useRecordContext();
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
    //
    // Upd. for react-admin 5: still the case, the list puts each of its records into the cache of single records
    // (useGetList), and the show view renders that one until the whole record arrives
    const locales = Object.keys(record?.localizedVersions || {});

    return (
        <>
            <SimpleShowLayout>
                <TextField source="name" />
            </SimpleShowLayout>
            <CardContent>
                <TemplateLocaleTabs value={tabValue} onChange={setTabValue} locales={locales} />

                {tabValue === 0 ? (
                    <TextField source="content" component="pre" sx={{ marginTop: 2 }} />
                ) : (
                    <TextField
                        source={`localizedVersions.${locales[tabValue - 1]}.content`}
                        component="pre"
                        sx={{ marginTop: 2 }}
                    />
                )}
            </CardContent>
        </>
    );
}

export function TemplateShow() {
    return (
        <Show title={<Title />} actions={<ShowTopToolbar />}>
            <ViewOfTemplate />
        </Show>
    );
}
