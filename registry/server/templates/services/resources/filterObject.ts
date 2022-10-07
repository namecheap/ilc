type ValueObject = { [key: string]: string };

type FilterValue = string[] | null;
type Filter = { [key: string]: FilterValue };

export const filterObject = (value: ValueObject, filter: Filter): ValueObject => {
    const allowedPropsNames = Object.keys(filter);

    return Object.keys(value)
        .filter((propertyName) => allowedPropsNames.includes(propertyName))
        .reduce<ValueObject>((filtered, propertyName) => {
            const propertyValue = value[propertyName];
            const allowedPropertyValues = filter[propertyName];

            if (allowedPropertyValues && allowedPropertyValues.length > 0) {
                if (allowedPropertyValues.includes(propertyValue)) {
                    filtered[propertyName] = propertyValue;
                }
            } else {
                filtered[propertyName] = propertyValue;
            }

            return filtered;
        }, {});
};
