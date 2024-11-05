import { LifeCycles } from 'ilc-sdk/app';
import { AppConfig } from './AppConfig';

export type CreateNewReturnType = Promise<ILCAdapter> | undefined | any;

export type CreateNewArgs = [{ appConfig?: AppConfig }, ...any[]];

export type ILCAdapter = LifeCycles<any> & {
    createNew?: (...args: CreateNewArgs) => CreateNewReturnType;
};
