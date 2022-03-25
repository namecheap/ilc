import React, { useState } from 'react';
import { Box, Button, Grid, Modal, TextField as MuiTextField, Typography } from '@material-ui/core';

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

    const addLang = () => {
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
                    <MuiTextField id="lang" label="Language, i.e. es-MX" value={props.value} fullWidth={true}
                                  onChange={e => setAddingLocale(e.target.value)} autoFocus={true}/>
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
