import { Tab, Tabs } from '@material-ui/core';
import React from 'react';

export function TemplateLocaleTabs(props) {
    return <Tabs value={props.value} onChange={props.onChange}>
        <Tab label={'Default'} id={'locale-0'} aria-controls={'locale-panel-0'}/>
        {props.locales
            .map(locale => <Tab label={locale} key={locale}
                                id={`locale-${locale}`}
                                aria-controls={`locale-panel-${locale}`}/>)}
    </Tabs>;
}
