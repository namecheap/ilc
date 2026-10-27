const { I } = inject();

// Routes seeded for several apps per slot and keep-alive (registry/server/seeds/04_routes.ts, 05_route_slots.ts)
export const multiUrl = '/multi/planets/';
export const keepAlivePeopleUrl = '/keep-alive/people/';
export const keepAlivePlanetsUrl = '/keep-alive/planets/';
export const multiSsrUrl = '/multi/ssr/';
export const keepAliveSsrUrl = '/keep-alive/ssr/';

// These routes use the "stack" template: navbar plus a "stack" slot. Every app of a multi-app or
// keep-alive slot renders into its own container inside the slot.
export const container = (app: string) => `body > div#stack > div[data-ilc-app-id="${app}__at__stack"]`;
export const containers = 'body > div#stack > div[data-ilc-app-id]';

export const peopleContainer = container('people');
export const planetsContainer = container('planets');
export const systemContainer = container('system');
export const systemWelcome = 'Hi! Welcome to our Demo website';

export const peopleView = `${peopleContainer} > div[class^="peoplePage"] > div[class^="peoplePageContents"]`;
export const personsList = `${peopleView} > div[class^="listWrapper"] > div.peopleList > a[class^="person"]`;
export const lastPerson = `${personsList}:last-child`;
export const selectedPerson = `${peopleView} > div[class^="selectedWrapper"] > div.selectedPerson > div.selectedPerson`;

export const planetsView = `${planetsContainer} > div.single-spa-container > div.view`;
export const planetsList = `${planetsView} > div.left > div.planetList > div`;

/** client-side navigation through ILC, no page reload */
export const navigate = (url: string) => I.executeScript((target: string) => (window as any).ILC.navigate(target), url);

export const recordVisibilityEvents = () =>
    I.executeScript(() => {
        (window as any).__ilcVisibility = [];
        window.addEventListener('ilc:app-visibility', (event: Event) =>
            (window as any).__ilcVisibility.push((event as CustomEvent).detail),
        );
    });

export const grabVisibilityEvents = () => I.executeScript(() => (window as any).__ilcVisibility);
