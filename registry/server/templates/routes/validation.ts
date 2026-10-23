import Joi from 'joi';

/** Used by the appRoutes Joi schemas until they move to Zod, templates validate with interfaces/index.ts */
export const templateNameSchema = Joi.string().min(1).max(50);
