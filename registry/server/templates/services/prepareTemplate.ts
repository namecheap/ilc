import _ from 'lodash/fp';

import Template from '../interfaces';

const convertTemplateContent = _.curry(((from: BufferEncoding, to: BufferEncoding, template: Template): Template => ({
    ...template,
    content: Buffer.from(template.content, from).toString(to),
})));

export const prepareTemplateToInsert = convertTemplateContent('utf-8', 'hex');
export const prepareTemplateToRespond = convertTemplateContent('hex', 'utf-8');
