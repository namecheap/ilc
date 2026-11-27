import Icon from '@mui/icons-material/FolderShared';

import type { ResourcePages } from '../App';
import { SharedPropsCreate, SharedPropsEdit } from './Edit';
import { SharedPropsList } from './List';
import { SharedPropsShow } from './Show';

export const sharedProps: ResourcePages = {
    list: SharedPropsList,
    create: SharedPropsCreate,
    edit: SharedPropsEdit,
    show: SharedPropsShow,
    icon: Icon,
};
