import Icon from '@mui/icons-material/PermIdentity';

import type { ResourcePages } from '../App';
import { AuthEntityCreate, AuthEntityEdit } from './Edit';
import { AuthEntityList } from './List';
import { AuthEntityShow } from './Show';

export const authEntities: ResourcePages = {
    list: AuthEntityList,
    create: AuthEntityCreate,
    edit: AuthEntityEdit,
    show: AuthEntityShow,
    icon: Icon,
};
