import Icon from '@mui/icons-material/ViewComfy';

import type { ResourcePages } from '../App';
import { SharedLibCreate, SharedLibEdit } from './Edit';
import { SharedLibList } from './List';
import { SharedLibShow } from './Show';

export const sharedLibs: ResourcePages = {
    list: SharedLibList,
    create: SharedLibCreate,
    edit: SharedLibEdit,
    show: SharedLibShow,
    icon: Icon,
};
