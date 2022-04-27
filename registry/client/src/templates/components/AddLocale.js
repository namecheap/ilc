import React, { useEffect, useState } from 'react';
import {
    Box,
    Button,
    FormControl,
    Grid, InputLabel,
    MenuItem,
    Modal,
    Select,
    TextField as MuiTextField,
    Typography
} from '@material-ui/core';
import fetchJson from '../../httpClient';

const modalBoxStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 400,
    bgcolor: 'background.paper',
    border: '2px solid #000',
    boxShadow: 24,
    p: 4,
};

export function AddLocale(props) {
    const [addingLocale, setAddingLocale] = useState('');
    const [supportedLocales, setSupportedLocales] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => {
        Promise.all([
            fetchJson('/api/v1/settings/i18n.supported.locale'),
            fetchJson('/api/v1/settings/i18n.default.locale')
        ])
            .then(([supportedResponse, defaultResponse]) => {
                let supportedLocalesSetting = supportedResponse.json.value;
                if (!Array.isArray(supportedLocalesSetting)) {
                    throw new Error('Unexpected response from API');
                }

                const defaultLocale = defaultResponse.json.value;
                const localesToAdd = supportedLocalesSetting.filter(v => !props.currentLocales.includes(v) && defaultLocale !== v);
                setSupportedLocales(localesToAdd);
                if (localesToAdd.length === 0) {
                    setError('No languages left to add. If you need to add a new language change `ilc.supported.locale` setting first.')
                }
            })
            .catch(e => {
                setError(`Unable to fetch supported language due to ${e.message}`)
            });
    })

    const addLang = (e) => {
        e.preventDefault();
        props.onLocaleAdded(addingLocale);
        setAddingLocale('');
    }

    return <Modal
        open={props.open}
    >
        <Box sx={modalBoxStyle}>
            <form onSubmit={addLang}>
                <Typography variant={'h5'}>Add new Language</Typography>
                <Box pt={2}>
                    {error ? <Typography>{error}</Typography> : (<FormControl fullWidth={true}>
                        <InputLabel id="lang-input-label">Language, i.e. es-MX</InputLabel>
                        <Select id="lang-select" labelId={"lang-input-label"} value={props.value}
                                onChange={e => setAddingLocale(e.target.value)} fullWidth={true}>
                            {supportedLocales.map(locale => <MenuItem key={locale} value={locale}>{locale}</MenuItem>)}
                        </Select>
                    </FormControl>)}
                </Box>
                <Box pt={2}>
                    <Grid container={true} direction={'row'} justifyContent={'flex-end'} spacing={2}>
                        <Grid item>
                            <Button type={'submit'} color={'primary'} variant={'contained'}>Add Locale</Button>
                        </Grid>
                        <Grid item>
                            <Button onClick={props.onCancel}>Cancel</Button>
                        </Grid>
                    </Grid>
                </Box>
            </form>
        </Box>
    </Modal>;
}
