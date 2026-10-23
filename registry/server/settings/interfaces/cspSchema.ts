import { z } from 'zod';

const cspSrcValidator = z.array(z.string()).optional();
export const cspSchema = z
    .strictObject({
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
        reportUri: z.string().min(1),
        mediaSrc: cspSrcValidator,
        childSrc: cspSrcValidator,
        formAction: cspSrcValidator,
        manifestSrc: cspSrcValidator,
        objectSrc: cspSrcValidator,
        scriptSrcAttr: cspSrcValidator,
        scriptSrcElem: cspSrcValidator,
        baseUri: cspSrcValidator,
        frameAncestors: cspSrcValidator,
        sandbox: z
            .array(
                z.enum([
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
                ]),
            )
            .optional(),
        upgradeInsecureRequests: z.boolean().optional(),
    })
    .nullable();
