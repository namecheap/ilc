import React, { useState, useEffect } from 'react';
import {
    TabbedShowLayout,
    Tab,
    BooleanField,
    TextField,
    ReferenceField,
    SelectField,
    ShowController,
    ShowView,
} from 'react-admin';
import { JsonFieldShow } from '../JsonField'; // eslint-disable-line import/no-unresolved
import dataProvider from '../dataProvider';
import Title from './Title';
import { EMPTY_TEXT } from '../constants';
import { ShowTopToolbar, ListArrayFields } from '../components';
import { APP_KINDS, SPECIAL_ROLES } from '../constants';

export default ({ permissions, hasList, hasEdit, hasShow, hasCreate, ...props }) => {
    const [isMultiDomain, setIsMultiDomain] = useState(false);

    useEffect(() => {
        dataProvider.getList('router_domains', { pagination: false, sort: false, filter: false }).then(({ data }) => {
            if (!data.length) {
                return;
            }

            setIsMultiDomain(true);
        });
    }, []);

    return (
        <ShowController {...props}>
            {({ translate, ...controllerProps }) => (
                <ShowView {...props} {...controllerProps} title={<Title />} actions={<ShowTopToolbar />}>
                    <TabbedShowLayout {...props} toolbar={null}>
                        <Tab label="General">
                            <TextField source="id" />
                            {controllerProps.record?.specialRole ? (
                                <SelectField source="specialRole" label="Special role" choices={SPECIAL_ROLES} />
                            ) : (
                                [
                                    <TextField source="route" key="route" label="Route" />,
                                    <TextField source="orderPos" key="orderPos" label="Order position of the route" />,
                                    <BooleanField source="next" key="next" defaultValue={false} />,
                                ]
                            )}

                            <ReferenceField
                                reference="template"
                                source="templateName"
                                label="Template name"
                                emptyText={EMPTY_TEXT}
                            >
                                <TextField source="name" />
                            </ReferenceField>
                            {isMultiDomain ? (
                                <ReferenceField
                                    reference="router_domains"
                                    source="domainId"
                                    label="Domain"
                                    emptyText={EMPTY_TEXT}
                                >
                                    <TextField source="domainName" />
                                </ReferenceField>
                            ) : null}
                            <JsonFieldShow source="meta" label="Metadata" />
                            <TextField source="namespace" emptyText={EMPTY_TEXT} />
                        </Tab>
                        <Tab label="Slots">
                            <ListArrayFields source="slots" emptyText="There are no slots for this route">
                                <TextField source="key" label="Slot name" />
                                <ReferenceField
                                    reference="app"
                                    filter={{ kind: APP_KINDS.map((v) => v.id) }}
                                    source="appName"
                                    label="App name"
                                    link={(data, category) => '/' + category + '/' + encodeURIComponent(data.appName)}
                                >
                                    <TextField source="name" />
                                </ReferenceField>
                                <SelectField
                                    source="kind"
                                    label="App type"
                                    emptyText={EMPTY_TEXT}
                                    choices={APP_KINDS}
                                />
                                <JsonFieldShow
                                    source="props"
                                    label="Properties that will be passed to application at current route"
                                />
                            </ListArrayFields>
                        </Tab>
                    </TabbedShowLayout>
                </ShowView>
            )}
        </ShowController>
    );
};
