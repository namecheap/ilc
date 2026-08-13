import React from 'react';
import { EditButton } from 'react-admin';

/**
 * Edit button that is disabled for records marked "protected" by the API —
 * entities managed externally (see the "protectedEntities" registry config).
 */
const ProtectedEditButton = (props) => <EditButton {...props} disabled={!!(props.record && props.record.protected)} />;

export default ProtectedEditButton;
