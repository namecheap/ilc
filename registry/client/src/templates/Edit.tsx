import Add from '@mui/icons-material/Add';
import Delete from '@mui/icons-material/Delete';
import { Button } from '@mui/material';
import { useState } from 'react';
import { Create, Edit, Labeled, SimpleForm, TextField, TextInput, required } from 'react-admin';
import { useFormContext, useWatch } from 'react-hook-form';

import { AddLocale } from './components/AddLocale';
import { TemplateLocaleTabs } from './components/TemplateLocaleTabs';
import { Title } from './Title';

type LocalizedVersions = Record<string, { content?: string | null }>;

/**
 * The default content of a template and its localized versions, one tab each.
 * The locales are the keys of `localizedVersions` in the form values, so adding or removing one is a form change.
 */
function TemplateContent() {
    const { setValue, getValues } = useFormContext();
    const localizedVersions: LocalizedVersions | undefined = useWatch({ name: 'localizedVersions' });
    const locales = Object.keys(localizedVersions ?? {});

    const [selectedTab, setSelectedTab] = useState(0);
    const [addLocaleOpened, setAddLocaleOpened] = useState(false);
    // A tab can be gone after the record is fetched again
    const openTab = selectedTab <= locales.length ? selectedTab : 0;

    function addLocale(locale: string) {
        setValue(`localizedVersions.${locale}.content`, '', { shouldDirty: true });
        setAddLocaleOpened(false);
    }

    function removeCurrentLocale() {
        const removed = locales[openTab - 1];
        const versions: LocalizedVersions = getValues('localizedVersions');
        const rest = Object.fromEntries(Object.entries(versions).filter(([locale]) => locale !== removed));
        setValue('localizedVersions', rest, { shouldDirty: true });
        setSelectedTab(0);
    }

    return (
        <>
            <AddLocale
                open={addLocaleOpened}
                currentLocales={locales}
                onLocaleAdded={addLocale}
                onCancel={() => setAddLocaleOpened(false)}
            />
            <div>
                <Button startIcon={<Add />} onClick={() => setAddLocaleOpened(true)}>
                    Add Locale
                </Button>
                <Button startIcon={<Delete />} onClick={removeCurrentLocale} disabled={openTab === 0}>
                    Remove Current Locale
                </Button>
            </div>
            <TemplateLocaleTabs locales={locales} onChange={setSelectedTab} value={openTab} />
            {openTab === 0 ? (
                <TextInput source="content" multiline fullWidth />
            ) : (
                <TextInput
                    key={locales[openTab - 1]}
                    source={`localizedVersions.${locales[openTab - 1]}.content`}
                    label={`Content for ${locales[openTab - 1]} language`}
                    multiline
                    fullWidth
                />
            )}
        </>
    );
}

export function TemplateForm({ mode }: { mode: 'create' | 'edit' }) {
    return (
        <SimpleForm>
            {mode === 'edit' ? (
                <Labeled>
                    <TextField source="name" />
                </Labeled>
            ) : (
                <TextInput source="name" fullWidth validate={required()} />
            )}
            <TemplateContent />
        </SimpleForm>
    );
}

export function TemplateEdit() {
    return (
        <Edit title={<Title />} mutationMode="pessimistic">
            <TemplateForm mode="edit" />
        </Edit>
    );
}

export function TemplateCreate() {
    return (
        <Create>
            <TemplateForm mode="create" />
        </Create>
    );
}
