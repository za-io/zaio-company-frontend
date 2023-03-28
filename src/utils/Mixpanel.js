import mixpanel from "mixpanel-browser";
mixpanel.init("4e2be35d7debc0ad57db236937d08d8d", { debug: true });

//let env_check = process.env.NODE_ENV === 'production';
let env_check = true;

let actions = {
  identify: (id) => {
    if (env_check) mixpanel.identify(id);
  },
  alias: (id) => {
    if (env_check) mixpanel.alias(id);
  },
  track: (name, props) => {
    if (env_check) mixpanel.track(name, props);
  },
  people: {
    set: (props) => {
      if (env_check) mixpanel.people.set(props);
    },
  },
  reset: () => {
    mixpanel.reset();
  },
};

export let Mixpanel = actions;
