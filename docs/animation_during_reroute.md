# Animation during reroute

## Demo 
![Animation during reroute](./assets/demoSpinner.gif)


## Implementation details
- Spinner appears only if transition from one route to another took more then 200ms.
- During transition ILC remove original MSs immediately and place fake cloned nodes to DOM, which in relust don't have 
any JS mouse listeners. so we strongly recommend to use backdrop for spinner. 
In any case, additionally it will cover any your bugs regarding interaction users with site during rerouting.

## How to customize default spinner

You can use your own spinner by setting `globalSpinner.customHTML` parameter via ILC Registry settings page.

Also you can turn off global spinner completely by changing `globalSpinner.enabled` parameter in Registry.