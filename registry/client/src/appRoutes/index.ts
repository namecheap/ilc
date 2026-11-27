import Icon from '@mui/icons-material/AccountTree';

import type { ResourcePages } from '../App';
import { AppRouteCreate, AppRouteEdit } from './Edit';
import { AppRouteList } from './List';
import { AppRouteShow } from './Show';

export const appRoutes: ResourcePages = {
    list: AppRouteList,
    create: AppRouteCreate,
    edit: AppRouteEdit,
    show: AppRouteShow,
    icon: Icon,
};
