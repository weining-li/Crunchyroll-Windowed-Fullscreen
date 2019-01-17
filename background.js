(function (chrome) {
    let namespace = 'Crunchyroll Windowed Fullscreen Extension'
    let instance = new Extension()
    
    /**
     * Listen for and execute extension actions.
     *
     * @param  object  request
     * @param  object  sender
     * @param  closure  sendResponse
     * @return void
     */
    chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
        var action = request.action || ''

        instance.log(`${action}()`, false)

        if (instance[action] === undefined) {
            throw new Error(`Unknown Action -> ${action}`)
        }

        instance[action](request, sender, sendResponse)
    })

    /**
     * Listen for when the current tab has finished loading.
     *
     * @param  integer  tabId
     * @param  object  changeInfo
     * @param  object  tab
     * @return void
     */
    chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
        if (changeInfo.status !== 'complete' || instance.initialized) {
            return
        }

//        chrome.browserAction.setIcon({ path: 'state-0.png', tabId })
        chrome.browserAction.setTitle({ title: 'Crunchyroll Full Windowed', tabId })
        chrome.browserAction.enable(tabId)
    })

    /**
     * Trigger a toggle event when the extension browser button is pressed.
     *
     * @param  object  tab
     * @return void
     */
    chrome.browserAction.onClicked.addListener(function (tab) {
        if (instance.state[tab.id] === undefined) {
            return
        }

        instance.log(`toggle()`, false)
        instance.toggle({}, { tab })
    })



    function Extension () {
        this.initialized = false
        this.state = {}

        /**
         * Log information to the extension's background page.
         *
         * @param  string  message
         * @param  boolean  response  true
         * @return void
         */
        this.log = function (message, response = true) {
            var indentation = response === true ? '   ->   ' : ''

            chrome.extension.getBackgroundPage().console.log(
                `[${namespace}]: ${indentation}${message}`
            )
        }

        /**
         * Initialize the extension.
         *
         * @param  object  request
         * @param  object  sender
         * @param  closure  sendResponse
         * @return void
         */
        this.initialize = function (request, sender, sendResponse) {
            this.state[sender.tab.id] = request.state

            this.log(`Initialization ${this.state[sender.tab.id]}`)

            this.initialized = true
        }

        /** 
         * Update the extension icon to indicate that a video player is available.
         *
         * @param  object  request
         * @param  object  sender
         * @param  closure  sendResponse
         * @return void
         */
        this.videoAvailable = function (request, sender, sendResponse) {
            let state = this.state[sender.tab.id]

            let path = state === true ? 'state-2.png' : 'state-1.png'
            let title = state === true ? 'Exit Full Windowed' : 'Enter Full Windowed'

            chrome.browserAction.setIcon({ path, tabId: sender.tab.id })
            chrome.browserAction.setTitle({ title, tabId: sender.tab.id })
            chrome.browserAction.enable(sender.tab.id)

            this.log(`Player available`)
        }
        

        /**
         * Update the extension icon to indicate that a video player is unavailable.
         *
         * @param  object  request
         * @param  object  sender
         * @param  closure  sendResponse
         * @return void
         */
        this.videoUnavailable = function (request, sender, sendResponse) {
            chrome.browserAction.setIcon({ path: 'state-0.png', tabId: sender.tab.id })
            chrome.browserAction.setTitle({ title: 'Crunchyroll Full Windowed', tabId: sender.tab.id })
            chrome.browserAction.disable(sender.tab.id)

            this.log(`Player unavailable`)
        }
        

        /**
         * Toggle the state of the extension.
         *
         * @param  object  request
         * @param  object  sender
         * @param  closure  sendResponse
         * @return void
         */
        this.toggle = function (request, sender, sendResponse) {
            let state = this.state[sender.tab.id] = ! this.state[sender.tab.id]

            let path = state === false ? 'state-1.png' : 'state-2.png'
            let title = state === false ? 'Enter Full Windowed' : 'Exit Full Windowed'

            chrome.browserAction.setIcon({ path, tabId: sender.tab.id })
            chrome.browserAction.setTitle({ title, tabId: sender.tab.id })

            this.log(`Update ${state}`)

            chrome.tabs.sendMessage(sender.tab.id, { action: 'toggle', state })

            if (sendResponse) {
                sendResponse(state)
            }
        }
    }
})(chrome)
