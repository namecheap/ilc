import uuidv4 from 'uuid/v4';

import registryService from '../registry/factory';
import noticeError from './noticeError';
import ilcEvents from '../constants/ilcEvents';

export default function crashIlc(errorId = '') {
    registryService.getTemplate('500')
        .then((data) => {
            data = data.data.replace('%ERRORID%', errorId ? `Error ID: ${errorId}` : '');

            document.querySelector('html').innerHTML = data;
            window.dispatchEvent(new CustomEvent(ilcEvents.CRASH));
        })
        .catch((error) => {
            noticeError(error, {
                type: 'FETCH_PAGE_ERROR',
                name: error.toString(),
                errorId: uuidv4(),
                fragmentErrorId: errorId,
            });

            alert('Something went wrong! Please try to reload page or contact support.');
        });
}
