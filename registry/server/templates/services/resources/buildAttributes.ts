import escapeHtml from 'escape-html';

export const buildAttributes = (values: { [key: string]: string }): string => {
    return Object.keys(values).reduce((stringified, propertyName, index) => {
        const space = index == 0 ? '' : ' ';
        const propertyValue = values[propertyName];

        let attribute = propertyName;

        if (propertyName !== propertyValue) {
            attribute += '="' + escapeHtml(propertyValue) + '"';
        }

        return stringified + space + attribute;
    }, '');
};
