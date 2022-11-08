import Joi from 'joi';
import { getJoiErr } from '../../util/helpers';
import renderTemplate from '../services/renderTemplate';

export default interface Template {
    name: string;
    content: string;
}

export interface LocalizedTemplate {
    templateName: string;
    content: string;
    locale: string;
}
