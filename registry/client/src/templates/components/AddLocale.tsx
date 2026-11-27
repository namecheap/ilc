import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    Typography,
} from '@mui/material';
import { useState, type FormEvent } from 'react';
import { useGetOne } from 'react-admin';

interface AddLocaleProps {
    open: boolean;
    /** Locales the template already has a version for */
    currentLocales: string[];
    onLocaleAdded: (locale: string) => void;
    onCancel: () => void;
}

export function AddLocale({ open, currentLocales, onLocaleAdded, onCancel }: AddLocaleProps) {
    const [addingLocale, setAddingLocale] = useState('');
    const supportedLocales = useGetOne('settings', { id: 'i18n.supported.locale' });
    const defaultLocale = useGetOne('settings', { id: 'i18n.default.locale' });

    let localesToAdd: string[] = [];
    let error = '';
    const fetchError = supportedLocales.error || defaultLocale.error;
    if (fetchError) {
        error = `Unable to fetch supported language due to ${fetchError.message}`;
    } else if (supportedLocales.data && defaultLocale.data) {
        const supported: unknown = supportedLocales.data.value;
        if (!Array.isArray(supported)) {
            error = 'Unable to fetch supported language due to Unexpected response from API';
        } else {
            localesToAdd = supported.filter(
                (locale) => !currentLocales.includes(locale) && defaultLocale.data.value !== locale,
            );
            if (localesToAdd.length === 0) {
                error =
                    'No languages left to add. If you need to add a new language change `ilc.supported.locale` setting first.';
            }
        }
    }

    function addLocale(event: FormEvent) {
        event.preventDefault();
        if (!addingLocale) {
            return;
        }
        onLocaleAdded(addingLocale);
        setAddingLocale('');
    }

    return (
        <Dialog open={open} onClose={onCancel} fullWidth maxWidth="xs">
            <form onSubmit={addLocale}>
                <DialogTitle>Add new Language</DialogTitle>
                <DialogContent>
                    {error ? (
                        <Typography>{error}</Typography>
                    ) : (
                        <FormControl fullWidth variant="standard" margin="dense">
                            <InputLabel id="lang-input-label">Language, i.e. es-MX</InputLabel>
                            <Select
                                id="lang-select"
                                labelId="lang-input-label"
                                value={addingLocale}
                                onChange={(event) => setAddingLocale(event.target.value)}
                            >
                                {localesToAdd.map((locale) => (
                                    <MenuItem key={locale} value={locale}>
                                        {locale}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={onCancel}>Cancel</Button>
                    <Button type="submit" color="primary" variant="contained">
                        Add Locale
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}
