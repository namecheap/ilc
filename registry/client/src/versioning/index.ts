import Icon from '@mui/icons-material/History';

import type { ResourcePages } from '../App';
import { VersioningList } from './List';

export const versioning: ResourcePages = {
    list: VersioningList,
    icon: Icon,
    options: { label: 'History' },
};
