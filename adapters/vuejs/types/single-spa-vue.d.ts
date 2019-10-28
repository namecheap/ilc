declare module "single-spa-vue" {
  export default function singleSpaVue(opts: SingleSpaVueOpts): SingleSpaVueLifecycles;

  type SingleSpaVueOpts = {
    Vue: any;
    appOptions?: any;
    template?: string;
    loadRootComponent?(): Promise<any>;
  }

  type SingleSpaVueLifecycles = {
    bootstrap(singleSpaProps: SingleSpaProps): Promise<any>;
    mount(singleSpaProps: SingleSpaProps): Promise<any>;
    unmount(singleSpaProps: SingleSpaProps): Promise<any>;
    update(singleSpaProps: SingleSpaProps): Promise<any>;
  }

  type SingleSpaProps = object;
}