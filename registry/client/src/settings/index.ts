import Icon from '@mui/icons-material/Settings';

import type { ResourcePages } from '../App';
import { SettingCreate } from './Create';
import { SettingEdit } from './Edit';
import { SettingList } from './List';

export const settings: ResourcePages = {
    list: SettingList,
    edit: SettingEdit,
    icon: Icon,
    create: SettingCreate,
};
