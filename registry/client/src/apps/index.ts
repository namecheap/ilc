import Icon from '@mui/icons-material/Apps';

import type { ResourcePages } from '../App';
import { AppCreate, AppEdit } from './Edit';
import { AppList } from './List';
import { AppShow } from './Show';

export const apps: ResourcePages = {
    list: AppList,
    create: AppCreate,
    edit: AppEdit,
    show: AppShow,
    icon: Icon,
};
