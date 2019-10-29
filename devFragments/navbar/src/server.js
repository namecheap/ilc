'use strict';

import React from 'react'
import { ServerLocation } from '@reach/router'
import App from './root.component';

export default function (url) {
    return (
        <ServerLocation url={url}><App/></ServerLocation>
    );
}