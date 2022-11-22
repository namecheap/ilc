import Joi from 'joi';

const cspSrcValidator = Joi.array().items(Joi.string()).optional();
export const cspSchema = Joi.object({
    defaultSrc: cspSrcValidator,
    connectSrc: cspSrcValidator,
    scriptSrc: cspSrcValidator,
    styleSrc: cspSrcValidator,
    fontSrc: cspSrcValidator,
    workerSrc: cspSrcValidator,
    frameSrc: cspSrcValidator,
    reportUri: Joi.string().required(),
}).allow(null);
