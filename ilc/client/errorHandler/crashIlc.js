import uuidv4 from 'uuid/v4';

import registryService from '../registry/factory';
import noticeError from './noticeError';

export default function crashIlc(errorId = '') {
    registryService.getTemplate('500')
        .then((data) => {
            data = data.data.replace('%ERRORID%', errorId ? `Error ID: ${errorId}` : '');

            document.querySelector('html').innerHTML = data;
            window.dispatchEvent(new CustomEvent('ilc:crash'));
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
