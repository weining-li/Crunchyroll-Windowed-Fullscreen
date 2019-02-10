const fullscreen_id_namespace = `windowed_fullscreen_is_underrated`;

const fullscreen_select = `${fullscreen_id_namespace}_select`;
const fullscreen_active = `${fullscreen_id_namespace}_active`;
const fullscreen_element_cloned = `${fullscreen_id_namespace}_clone`;
const fullscreen_parent = `${fullscreen_id_namespace}_parent`;
const body_class = `${fullscreen_id_namespace}_body`;

const popup_class = `${fullscreen_id_namespace}_popup`;

const max_z_index = '2147483647';


let fullscreenchange_aliasses = [
  'fullscreenchange',
  'webkitfullscreenchange',
  'mozfullscreenchange',
  'MSFullscreenChange',
];
let requestFullscreen_aliasses = [
  'requestFullscreen',
  'mozRequestFullScreen',
  'webkitRequestFullscreen',
  'webkitRequestFullScreen',
  'msRequestFullscreen',
];
let exitFullscreen_aliasses = [
  'exitFullscreen',
  'webkitExitFullscreen',
  'webkitCancelFullScreen',
  'mozCancelFullScreen',
  'msExitFullscreen',
];
let fullscreenelement_aliasses = [
  'fullscreenElement',
  'webkitFullscreenElement',
  'mozFullscreenElement',
  'mozFullScreenElement',
  'msFullscreenElement',
  'webkitCurrentFullScreenElement',
];

let external_functions = {};
let next_id = 1;

let on_webpage = (strings, ...values) => {
  let result = strings[0];

  let value_index = 1;
  for (let value of values) {
    if (typeof value === 'string') {
      result = result + value;
    }
    if (typeof value === 'object') {
      result = result + JSON.stringify(value);
    }
    if (typeof value === 'function') {
      external_functions[next_id] = value;
      result = result + `external_function(${next_id});`;
      next_id = next_id + 1;
    }
    result = result + strings[value_index];
    value_index = value_index + 1;
  }

  return result;
};

let all_communication_id = 0;
let external_function_parent = (function_id) => async (...args) => {
  let request_id = `FROM_CONTENT:${all_communication_id}`;
  all_communication_id = all_communication_id + 1;

  if (window.parent === window) {
    return;
  }

  window.parent.postMessage(
    {
      type: 'CUSTOM_WINDOWED_FROM_PAGE',
      request_id: request_id,
      function_id: function_id,
      args: args,
    },
    '*'
  );

  return new Promise((resolve, reject) => {
    let listener = (event) => {
      // We only accept messages from ourselves
      if (event.source != window.parent) return;
      if (event.data == null) return;

      if (event.data.type === 'CUSTOM_WINDOWED_TO_PAGE') {
        if (event.data.request_id === request_id) {
          window.removeEventListener('message', listener);
          resolve(event.data.result);
        }
      }
    };
    window.addEventListener('message', listener);
  });
};

let enable_selector = (element, key) => {
  element.dataset[key] = true;
};
let disable_selector = (element, key) => {
  delete element.dataset[key];
};

// Insert requestFullScreen mock
const code_to_insert_in_page = on_webpage`{
  // Alliases for different browsers
  let requestFullscreen_aliasses = ${JSON.stringify(
    requestFullscreen_aliasses
  )};
  let exitFullscreen_aliasses = ${JSON.stringify(exitFullscreen_aliasses)};
  let fullscreenelement_aliasses = ${JSON.stringify(
    fullscreenelement_aliasses
  )};
  let fullscreenchange_aliasses = ${JSON.stringify(fullscreenchange_aliasses)};

  const send_event = (element, type) => {
    const event = new Event(type, {
      bubbles: true,
      cancelBubble: false,
      cancelable: false,
    });
    // if (element[\`on\${type}\`]) {
    //   element[\`on\${type}\`](event);
    // }
    element.dispatchEvent(event);
  };

  const send_fullscreen_events = (element) => {
    for (let fullscreenchange of fullscreenchange_aliasses) {
      send_event(document, fullscreenchange);
    }
    send_event(window, 'resize');
  };

  let all_communication_id = 0;
  let external_function = (function_id) => async (...args) => {
    let request_id = all_communication_id;
    all_communication_id = all_communication_id + 1;

    window.postMessage({
      type: 'CUSTOM_WINDOWED_FROM_PAGE',
      request_id: request_id,
      function_id: function_id,
      args: args,
    }, '*');

    return new Promise((resolve, reject) => {
      let listener = (event) => {
        // We only accept messages from ourselves
        if (event.source != window) return;
        if (event.data == null) return;

        if (event.data.type === 'CUSTOM_WINDOWED_TO_PAGE') {
          if (event.data.request_id === request_id) {
            window.removeEventListener('message', listener);
            if (event.data.resultType === 'resolve') {
              resolve(event.data.result);
            } else {
              let err = new Error(event.data.result.message);
              err.stack = event.data.result.stack;
              reject(err);
            }
          }
        }
      }
      window.addEventListener('message', listener);
    });
  }

  let overwrite = (object, property, value) => {
    try {
      if (property in object) {
        Object.defineProperty(object, property, {
          value: value,
          configurable: true,
          writable: true,
        });
      }
    } catch (err) {
      // Nothing
    }
  }

  let set_fullscreen_element = (element = null) => {
    if (element == null) {
      throw new Error('WINDOWED: Got null in set_fullscreen_element');
    }

    overwrite(document, 'webkitIsFullScreen', true); // Old old old
    overwrite(document, 'fullscreen', true); // Old old old
    for (let fullscreenelement_alias of fullscreenelement_aliasses) {
      overwrite(document, fullscreenelement_alias, element);
    }
  }


  let make_tab_go_fullscreen = ${async () => {
    await go_into_fullscreen();
  }}
  let make_tab_go_winfull = ${async () => {
    await go_win_full();
  }}

  let create_popup = ${async () => {
    clear_popup();

    let is_fullscreen = await external_function_parent('is_fullscreen')();
    if (is_fullscreen) {
	    await go_out_of_fullscreen();
      return 'EXIT';
		}
		
		let host = window.location.host;
    let disabled = await browser.storage.sync.get([host]);
    // let is_enabled = await send_chrome_message({ type: 'is_windowed_enabled' });
    if (disabled[host] === true) {
      return 'NOT_ENABLED';
    }
    
    create_style_rule();
		
		let clicked_element_still_exists = last_click_y != null && last_click_x != null && document.elementsFromPoint(last_click_x, last_click_y).includes(last_click_element)
    if (clicked_element_still_exists && Date.now() - last_click_timestamp < 1000) {
      let top_vs_bottom =
        last_click_y < window.innerHeight / 2
          ? 'translateY(0px)'
          : 'translateY(-100%)';
      let left_vs_right =
        last_click_x < window.innerWidth / 2
          ? 'translateX(0px)'
          : 'translateX(-100%)';

      let popup = createElementFromHTML(`
        <div class="${popup_class}" style="
          position: absolute;
          top: ${last_click_y}px;
          left: ${last_click_x}px;
          transform: ${top_vs_bottom} ${left_vs_right};
				">
				
          <div data-target="win-full">
            <span title="Windowed Fullscreen" class = "bg-svgicon"><svg fill="white" height="22" width="22" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 22"><style>.st0{fill:#fff}</style><path d="M18 4H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM8 15.5a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-3a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5V14h1.5a.5.5 0 0 1 .5.5v1zm0-8a.5.5 0 0 1-.5.5H6v1.5a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-3a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5v1zm10 8a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5H16v-1.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v3zm0-6a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5V8h-1.5a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5v3z"></path></svg></span>
					</div>
					
          <div data-target="normal">
            <span title="Normal Fullscreen" class = "bg-svgicon"><svg fill="white" height="22" width="22" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 22"><style>.st0{fill:#fff}</style><path class="st0" d="M20 11h-6c0-1.2-.7-2.2-1.7-2.7L15 2.9c3 1.5 5 4.6 5 8.1zM15.8 18.6c-1.4.9-3 1.4-4.8 1.4s-3.4-.5-4.8-1.4l2.7-5.4c.6.5 1.3.8 2.1.8s1.5-.3 2.1-.8l2.7 5.4zM11 8V2v6zM7 2.9l2.7 5.4C8.7 8.8 8 9.8 8 11H2c0-3.5 2-6.6 5-8.1z"></path><circle class="st0" cx="11" cy="11" r="1"></circle></svg></span>             
					</div>
					
        </div>
      `);
      addStyleString('.bp-svgicon { fill: hsla(0,0%,100%,.9) }');
      document.body.appendChild(popup);
      last_popup = popup;
    } else {
      let popup = createElementFromHTML(`
        <div>
          <div
            style="
              position: fixed;
              top: 0; left: 0;
              right: 0; bottom: 0;
              background-color: rgba(0,0,0,.8);
              pointer-events: none;
              z-index: ${max_z_index};
            "
          ></div>

          <div class="${popup_class}" style="
            position: fixed;
            top: 25vh;
            left: 50vw;
            transform: translateX(-50%) translateY(-50%);
            font-size: 20px;
            color: white
          ">
            <div style="padding: 1.25em; padding-bottom: 0.25em; padding-top: 0.25em"><center> Modes </center></div>
            <div style="height: 10px"></div>

            <div data-target="win-full">
              <span title="Windowed Fullscreen"><svg fill="white" height="20" width="30" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 19 20"><style>.st0{fill:#fff}</style><path d="M18 4H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM8 15.5a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-3a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5V14h1.5a.5.5 0 0 1 .5.5v1zm0-8a.5.5 0 0 1-.5.5H6v1.5a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-3a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5v1zm10 8a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5H16v-1.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v3zm0-6a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5V8h-1.5a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5v3z"></path></svg></span>
              <span style="color:white">Windowed</span>
            </div>
            <div data-target="normal">
              <span title="Normal Fullscreen"><svg fill="white" height="20" width="30" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 19 20"><style>.st0{fill:#fff}</style><path class="st0" d="M20 11h-6c0-1.2-.7-2.2-1.7-2.7L15 2.9c3 1.5 5 4.6 5 8.1zM15.8 18.6c-1.4.9-3 1.4-4.8 1.4s-3.4-.5-4.8-1.4l2.7-5.4c.6.5 1.3.8 2.1.8s1.5-.3 2.1-.8l2.7 5.4zM11 8V2v6zM7 2.9l2.7 5.4C8.7 8.8 8 9.8 8 11H2c0-3.5 2-6.6 5-8.1z"></path><circle class="st0" cx="11" cy="11" r="1"></circle></svg></span>             
              <span style="color:white">Normal</span>
            </div>

          </div>
        </div>
      `);
      document.body.appendChild(popup);
      last_popup = popup;
		}
		
		let result = await new Promise((resolve) => {
      for (let button of document.querySelectorAll(`.${popup_class} [data-target]`)) {
        button.addEventListener(
          'click',
          (e) => {
            resolve(button.dataset.target);
          },
          {
            once: true,
          }
        );
      }
		});
		
		clear_popup();

		if (result === 'normal') {
      let element = document.querySelector(`[data-${fullscreen_select}]`);
      disable_selector(element, fullscreen_select);

      element.webkitRequestFullScreen();
      return 'NORMAL';
		}
		
    if (result === 'win-full') {
      await go_win_full();
      return 'WIN-FULL';
    }
    if (result === 'exit') {
      await go_out_of_fullscreen();
      return 'EXIT';
    }
	}}
	
	let make_tab_exit_fullscreen = ${async () => {
    await go_out_of_fullscreen();
    send_fullscreen_events();
	}}
	
	
  let exitFullscreen = async function(original) {
    let windowed_fullscreen = document.querySelector('[data-${fullscreen_active}]');

    if (windowed_fullscreen) {
      // If the fullscreen element is a frame, tell it to exit fullscreen too
      if (typeof windowed_fullscreen.postMessage === 'function') {
        document.fullscreenElement.postMessage.sendMessage({ type: "exit_fullscreen_iframe" });
      }

      // Reset all the variables to their browser form
      delete window.screen.width;
      delete window.screen.height;
      delete document['webkitIsFullScreen'];
      delete document['fullscreen'];
      for (let fullscreenelement_alias of fullscreenelement_aliasses) {
        delete document[fullscreenelement_alias];
      }

      await make_tab_exit_fullscreen();
    } else {
      original();
    }
  }

  ${'' /* NOTE requestFullscreen */}
  const requestFullscreen = async function(original, ...args) {
    const element = this;
    element.dataset['${fullscreen_select}'] = true;

    // Tell extension code (outside of this block) to go into fullscreen
    // window.postMessage({ type: force ? "enter_fullscreen" : "show_fullscreen_popup" }, "*");
    // send_windowed_event(element, force ? "enter_fullscreen" : "show_fullscreen_popup");
    try {
      let next = await create_popup();
      if (next === 'NOT_ENABLED') {
        original();
      }
    } catch (err) {
      // Anything gone wrong, we default to normal fullscreen
      console.error('[Windowed] Something went wrong, so I default to normal fullscreen:', err.stack);
      original();
    }
  }

  let finish_fullscreen = () => {
    // Because youtube actually checks for those sizes?!
    const window_width = Math.max(window.outerWidth, window.innerWidth);
    const window_height = Math.max(window.outerHeight, window.innerHeight);
    overwrite(window.screen, 'width', window_width);
    overwrite(window.screen, 'height', window_height);

    let element = document.querySelector('[data-${fullscreen_select}]');
    if (element == null) {
      console.log('[WINDOWED] Strange, no fullscreen element shown');
      return;
    }

    element.focus();
    set_fullscreen_element(element || document.body);
    send_fullscreen_events();
  }

  window.onmessage = (message) => {
    const frame = [...document.querySelectorAll('iframe')].find(x => x.contentWindow === message.source);

    if (frame || window.parent === message.source || message.target === message.source) {
      if (message.data && message.data.type === 'WINDOWED-confirm-fullscreen') {
        finish_fullscreen();
      }
    }
    if (frame || window.parent === message.source || message.target === message.source) {
      if (message.data && message.data.type === 'WINDOWED-exit-fullscreen') {
        exitFullscreen.call(document, original_exitFullscreen);
      }
    }

    if (frame != null && message.data) {
      if (message.data.type === 'enter_winfull_iframe') {
        frame.dataset['${fullscreen_select}'] = true;
        make_tab_go_winfull();
      }
      if (message.data.type === 'enter_fullscreen_iframe') {
        frame.dataset['${fullscreen_select}'] = true;
        make_tab_go_fullscreen();
      }
      if (message.data.type === 'exit_fullscreen_iframe') {
        // Call my exitFullscreen on the document
        exitFullscreen.call(document, original_exitFullscreen);
      }
    }
  }

  ${
    '' /* NOTE Replace all the `requestFullscreen` aliasses with calls to my own version */
  }
  let original_requestFullscreen = null;
  requestFullscreen_aliasses.forEach(requestFullscreenAlias => {
    if (typeof Element.prototype[requestFullscreenAlias] === 'function') {
      let original_function = Element.prototype[requestFullscreenAlias];
      original_requestFullscreen = original_function;
      Element.prototype[requestFullscreenAlias] = function(...args) {
        requestFullscreen.call(this, original_function.bind(this), ...args);
      };
    }
  });

  ${
    '' /* NOTE Replace all the `exitFullscreen` aliasses with calls to my own version */
  }
  let original_exitFullscreen = null;
  exitFullscreen_aliasses.forEach(exitFullscreenAlias => {
    if (typeof Document.prototype[exitFullscreenAlias] === 'function') {
      let original_function = Document.prototype[exitFullscreenAlias];
      original_exitFullscreen = original_function;
      Document.prototype[exitFullscreenAlias] = function(...args) {
        exitFullscreen.call(this, original_function.bind(this), ...args);
      };
    }
  });
}
`;

let elt = document.createElement('script');
elt.innerHTML = code_to_insert_in_page;
document.documentElement.appendChild(elt);
document.documentElement.removeChild(elt);

const send_event = (element, type) => {
  const event = new Event(type, {
    bubbles: true,
    cancelBubble: false,
    cancelable: false,
  });
  element.dispatchEvent(event);
};

const send_fullscreen_events = () => {
  for (let fullscreenchange of fullscreenchange_aliasses) {
    send_event(document, fullscreenchange);
  }
  send_event(window, 'resize');
};

let clear_listeners = () => {};

let delay = (ms) => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(), ms);
  });
};

let create_style_rule = () => {
	
  let css = `
    [data-${body_class}] [data-${fullscreen_active}] {
      position: fixed !important;
      top: 0 !important;
      bottom: 0 !important;
      right: 0 !important;
      left: 0 !important;
      width: 100%;
      height: 100%;
      z-index: ${max_z_index} !important;
    }

    [data-${body_class}] [data-${fullscreen_parent}] {
      /* This thing is css black magic */
      all: initial !important;
      z-index: ${max_z_index} !important;

      /* Debugging */
      background-color: rgba(0,0,0,.1) !important;
    }

    .${popup_class} {
      background:rgba(0,0,0,0.6);
      border-radius: 3px;
			border: solid #eee 1px;
			border-color: rgba(0,0,0,0.2) transparent transparent;
      box-shadow: 0px 2px 4px #00000026;
      padding-top: 5px;
      padding-bottom: 5px;
      font-size: 12px;
      color: black;
      min-width: 40px;
      z-index: ${max_z_index};
    }

    .${popup_class} [data-target] {
      cursor: pointer;
      padding: 1.25em;
      padding-top: 0.25em;
      padding-bottom: 0.25em;
      background-color: transparent;

      display: flex;
      flex-direction: row;
      align-items: center;
    }

    .${popup_class} [data-target] > img {
      height: 0.8em;
      margin-right: 1em;
    }

    .${popup_class} [data-target]:hover {
      filter: brightness(0.6);
    }
  `;

  let styleEl = document.createElement('style');
  document.head.appendChild(styleEl);
  styleEl.appendChild(document.createTextNode(css));
};

const parent_elements = function*(element) {
  let el = element.parentElement;
  while (el) {
    yield el;
    el = el.parentElement;
  }
};


let last_click_x = null;
let last_click_y = null;
let last_click_timestamp = 0;
let last_click_element = null

let last_popup = null;
let is_in_fullscreen = false;

let clear_popup = () => {
  if (last_popup != null) {
    try {
      document.body.removeChild(last_popup);
    } catch (err) {}
    last_popup = null;
    return true;
  }
  return false
};


document.onclick = function(e) {
  last_click_x = e.pageX;
  last_click_y = e.pageY;
  last_click_timestamp = Date.now();
  last_click_element = e.target;
	
  if (last_popup != null && (e.target === last_popup || last_popup.contains(e.target))){
    // Clicked inside popup
  } else {
    if (clear_popup()) {
      send_fullscreen_events();
    }
  }
};

let exit_fullscreen_on_page = () => {
  window.postMessage(
    {
      type: 'WINDOWED-exit-fullscreen',
    },
    '*'
  );
};

let createElementFromHTML = (htmlString) => {
  var div = document.createElement('div');
  div.innerHTML = htmlString.trim();
  return div.firstChild;
};

let addStyleString = (str) => {
  var node = document.createElement('style');
  node.innerHTML = str;
  document.body.appendChild(node);
}

let go_win_full = async () => {
  create_style_rule();
  clear_listeners();
  let element = document.querySelector(`[data-${fullscreen_select}]`);

  let escape_listener = (e) => {
    if (!e.defaultPrevented && e.which === 27) {
      exit_fullscreen_on_page();
    }
  };
  window.addEventListener('keyup', escape_listener);

  let beforeunload_listener = (e) => {
    exit_fullscreen_on_page();
  };
  window.addEventListener('beforeunload', beforeunload_listener);

  clear_listeners = () => {
    window.removeEventListener('keyup', escape_listener);
    window.removeEventListener('beforeunload', beforeunload_listener);
  };

  enable_selector(element, fullscreen_active);
  // Add fullscreen class to every parent of our fullscreen element
  for (let parent_element of parent_elements(element)) {
    enable_selector(parent_element, fullscreen_parent);
  }

  if (window.parent !== window) {
    // Ask parent-windowed code to become fullscreen too
    window.parent.postMessage({ type: 'enter_winfull_iframe' }, '*');
  }

  window.postMessage({ type: 'WINDOWED-confirm-fullscreen' }, '*');

  // Add no scroll to the body and let everything kick in
  enable_selector(document.body, body_class);
}


let go_out_of_fullscreen = async () => {
  // Remove no scroll from body (and remove all styles)
  disable_selector(document.body, body_class);

  // Remove fullscreen class... from everything
  for (let element of document.querySelectorAll(
    `[data-${fullscreen_parent}]`
  )) {
    disable_selector(element, fullscreen_parent);
  }

  clear_listeners();

  send_fullscreen_events();

  const fullscreen_element = document.querySelector(
    `[data-${fullscreen_select}]`
  );
  disable_selector(fullscreen_element, fullscreen_select);
  disable_selector(fullscreen_element, fullscreen_active);

  // If we are a frame, tell the parent frame to exit fullscreen
  window.parent.postMessage({ type: 'exit_fullscreen_iframe' }, '*');
};


external_functions.is_fullscreen = () => {
  const fullscreen_element = document.querySelector(
    `[data-${fullscreen_active}]`
  );
  return fullscreen_element != null;
};

window.addEventListener('message', async (event) => {
  // We only accept messages from ourselves
  if (event.data == null) return;
  if (event.data.type === 'CUSTOM_WINDOWED_FROM_PAGE') {
    let fn = external_functions[event.data.function_id];
    try {
      let result = await fn(...event.data.args);
      event.source.postMessage(
        {
          type: 'CUSTOM_WINDOWED_TO_PAGE',
          request_id: event.data.request_id,
          resultType: 'resolve',
          result: result,
        },
        '*'
      );
    } catch (err) {
      event.source.postMessage(
        {
          type: 'CUSTOM_WINDOWED_TO_PAGE',
          request_id: event.data.request_id,
          resultType: 'reject',
          result: {
            message: err.message,
            stack: err.stack,
          },
        },
        '*'
      );
    }
  }
});