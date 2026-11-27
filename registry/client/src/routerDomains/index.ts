import Icon from '@mui/icons-material/Language';

import type { ResourcePages } from '../App';
import { RouterDomainCreate, RouterDomainEdit } from './Edit';
import { RouterDomainList } from './List';
import { RouterDomainShow } from './Show';

export const routerDomains: ResourcePages = {
    list: RouterDomainList,
    create: RouterDomainCreate,
    edit: RouterDomainEdit,
    show: RouterDomainShow,
    icon: Icon,
};
