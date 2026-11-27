import { Tab, Tabs } from '@mui/material';

interface TemplateLocaleTabsProps {
    locales: string[];
    /** The index of the open tab: 0 is the default content, the locales follow */
    value: number;
    onChange: (value: number) => void;
}

export function TemplateLocaleTabs({ locales, value, onChange }: TemplateLocaleTabsProps) {
    return (
        <Tabs value={value} onChange={(_event, newValue: number) => onChange(newValue)}>
            <Tab label="Default" />
            {locales.map((locale) => (
                <Tab label={locale} key={locale} />
            ))}
        </Tabs>
    );
}
