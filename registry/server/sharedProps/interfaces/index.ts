import Joi from '@hapi/joi';

export default interface SharedProps {
    name: string,
    props: string,
};

export const sharedPropsNameSchema = Joi.string().min(1).max(50);

const commonSharedProps = {
    props: Joi.object(),
};

export const partialSharedPropsSchema = Joi.object({
    ...commonSharedProps,
    name: sharedPropsNameSchema.forbidden(),
});

export const sharedPropsSchema = Joi.object({
    ...commonSharedProps,
    name: sharedPropsNameSchema.required(),
    props: commonSharedProps.props.required(),
});
