import type { ReactNode } from 'react';
import { CheckForApplicationUpdate, Layout as RALayout } from 'react-admin';

export function Layout({ children }: { children: ReactNode }) {
    return (
        <RALayout>
            {children}
            <CheckForApplicationUpdate />
        </RALayout>
    );
}
