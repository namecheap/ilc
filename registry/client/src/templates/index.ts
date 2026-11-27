import Icon from '@mui/icons-material/DeveloperBoard';

import type { ResourcePages } from '../App';
import { TemplateCreate, TemplateEdit } from './Edit';
import { TemplateList } from './List';
import { TemplateShow } from './Show';

export const templates: ResourcePages = {
    list: TemplateList,
    create: TemplateCreate,
    edit: TemplateEdit,
    show: TemplateShow,
    icon: Icon,
};
