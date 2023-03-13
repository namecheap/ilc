import { useLocation } from 'react-router-dom';

export const useQueryParams = (paramKey) => {
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    return queryParams.get(paramKey) || undefined;
}
