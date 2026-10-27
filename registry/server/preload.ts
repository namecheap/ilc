// Imported first by every entry point of the compiled server.
// newrelic.js reads node-config, so the config folder is set before New Relic loads,
// and New Relic loads before the modules it instruments.
import '../config/configDir';
import 'newrelic';
