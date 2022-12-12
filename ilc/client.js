import './client/navigationEvents/setupEvents';
import { getIlcConfigRoot } from './client/configuration/getIlcConfigRoot';
import { SystemJSImportMap } from './client/configuration/SystemJSImportMap';
import { Client } from './client/Client';

const ilcConfigRoot = getIlcConfigRoot();

const systemJSImportMap = new SystemJSImportMap(
    ilcConfigRoot.getConfigForApps(),
    ilcConfigRoot.getConfigForSharedLibs(),
);

systemJSImportMap.configure();

new Client(ilcConfigRoot).start();
