import RichTextInput from 'ra-input-rich-text';
import React from 'react';
import {
    TopToolbar,
    AutocompleteInput,
    ArrayInput,
    BooleanInput,
    CheckboxGroupInput,
    DateInput,
    Edit,
    CloneButton,
    ShowButton,
    FormTab,
    ImageField,
    ImageInput,
    NumberInput,
    ReferenceInput,
    SelectInput,
    SimpleFormIterator,
    TabbedForm,
    TextInput,
    minValue,
    number,
    required,
    FormDataConsumer,
} from 'react-admin'; // eslint-disable-line import/no-unresolved
import PostTitle from './Title';
import TagReferenceInput from './TagReferenceInput';

const EditActions = ({ basePath, data, hasShow }) => (
    <TopToolbar>
        <CloneButton
            className="button-clone"
            basePath={basePath}
            record={data}
        />
        {hasShow && <ShowButton basePath={basePath} record={data} />}
    </TopToolbar>
);

const MyEdit = ({ permissions, ...props }) => (
    <Edit title={<PostTitle />} actions={<EditActions />} {...props}>
        <TabbedForm initialValues={{ average_note: 0 }}>
            <FormTab label="Summary">
                <TextInput disabled source="id" />
                <TextInput source="title" validate={required()} resettable />
                <TextInput
                    multiline={true}
                    fullWidth={true}
                    source="teaser"
                    validate={required()}
                    resettable
                />
                <CheckboxGroupInput
                    source="notifications"
                    choices={[
                        { id: 12, name: 'Ray Hakt' },
                        { id: 31, name: 'Ann Gullar' },
                        { id: 42, name: 'Sean Phonee' },
                    ]}
                />
                <ImageInput multiple source="pictures" accept="image/*">
                    <ImageField source="src" title="title" />
                </ImageInput>
                {permissions === 'admin' && (
                    <ArrayInput source="authors">
                        <SimpleFormIterator>
                            <ReferenceInput
                                label="User"
                                source="user_id"
                                reference="users"
                            >
                                <AutocompleteInput />
                            </ReferenceInput>
                            <FormDataConsumer>
                                {({
                                    formData,
                                    scopedFormData,
                                    getSource,
                                    ...rest
                                }) =>
                                    scopedFormData && scopedFormData.user_id ? (
                                        <SelectInput
                                            label="Role"
                                            source={getSource('role')}
                                            choices={[
                                                {
                                                    id: 'headwriter',
                                                    name: 'Head Writer',
                                                },
                                                {
                                                    id: 'proofreader',
                                                    name: 'Proof reader',
                                                },
                                                {
                                                    id: 'cowriter',
                                                    name: 'Co-Writer',
                                                },
                                            ]}
                                            {...rest}
                                        />
                                    ) : null
                                }
                            </FormDataConsumer>
                        </SimpleFormIterator>
                    </ArrayInput>
                )}
            </FormTab>
            <FormTab label="Body">
                <RichTextInput
                    source="body"
                    label=""
                    validate={required()}
                    addLabel={false}
                />
            </FormTab>
            <FormTab label="Miscellaneous">
                <ArrayInput source="backlinks">
                    <SimpleFormIterator>
                        <DateInput source="date" />
                        <TextInput source="url" />
                    </SimpleFormIterator>
                </ArrayInput>
                <DateInput source="published_at" options={{ locale: 'pt' }} />
                <SelectInput
                    allowEmpty
                    resettable
                    source="category"
                    choices={[
                        { name: 'Tech', id: 'tech' },
                        { name: 'Lifestyle', id: 'lifestyle' },
                    ]}
                />
                <NumberInput
                    source="average_note"
                    validate={[required(), number(), minValue(0)]}
                />
                <BooleanInput source="commentable" defaultValue />
                <TextInput disabled source="views" />
            </FormTab>
        </TabbedForm>
    </Edit>
);

export default MyEdit;
