import { CreateButton, TopToolbar, useResourceDefinition } from 'react-admin';

/**
 * Actions of a list that has filters. The default ones add a filter button, which only offers
 * to save the current query, as every filter here is always shown.
 */
export function ListTopToolbar() {
    const { hasCreate } = useResourceDefinition();

    return <TopToolbar>{hasCreate && <CreateButton />}</TopToolbar>;
}
