import Joi from 'joi';

const cspSrcValidator = Joi.array().items(Joi.string()).optional();
export const cspSchema = Joi.object({
    defaultSrc: cspSrcValidator,
    connectSrc: cspSrcValidator,
    scriptSrc: cspSrcValidator,
    styleSrc: cspSrcValidator,
    styleSrcElem: cspSrcValidator,
    styleSrcAttr: cspSrcValidator,
    fontSrc: cspSrcValidator,
    imgSrc: cspSrcValidator,
    workerSrc: cspSrcValidator,
    frameSrc: cspSrcValidator,
    reportUri: Joi.string().required(),
    mediaSrc: cspSrcValidator,
    childSrc: cspSrcValidator,
    formAction: cspSrcValidator,
    manifestSrc: cspSrcValidator,
    objectSrc: cspSrcValidator,
    scriptSrcAttr: cspSrcValidator,
    scriptSrcElem: cspSrcValidator,
    baseUri: cspSrcValidator,
    frameAncestors: cspSrcValidator,
    sandbox: Joi.array()
        .items(
            Joi.string().valid(
                'allow-forms',
                'allow-modals',
                'allow-orientation-lock',
                'allow-pointer-lock',
                'allow-popups',
                'allow-popups-to-escape-sandbox',
                'allow-presentation',
                'allow-same-origin',
                'allow-scripts',
                'allow-storage-access-by-user-activation',
                'allow-top-navigation',
            ),
        )
        .optional(),
    upgradeInsecureRequests: Joi.boolean().optional(),
}).allow(null);
