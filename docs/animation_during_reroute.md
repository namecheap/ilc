# Animation during reroute

## Demo

![Animation during reroute](./assets/demoSpinner.gif)

## Implementation details

- Spinner appears only if the transition between routes takes more than 200ms.
- During the transition, ILC removes the original MSs and places fake-cloned nodes to DOM that don't have any JS mouse listeners. So it is recommended to use a backdrop for the spinner.

## Default spinner customization

* To set your own spinner, modify the `globalSpinner.customHTML` parameter in the ILC Registry settings page.
* To disable the spinner, disable the value of the `globalSpinner.enabled` parameter in the ILC Registry settings page.
