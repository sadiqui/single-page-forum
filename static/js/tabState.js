// Function to get current tab state
function getTabState() {
    const tabStateStr = localStorage.getItem('tabState');
    if (tabStateStr) {
        return JSON.parse(tabStateStr);
    }
    // Default tab state if none exists
    return {
        main: 'home',
        activity: 'liked',
        profile: 'about'
    };
}

// Function to save tab state
function saveTabState(section, tabName) {
    const currentState = getTabState();
    currentState[section] = tabName;
    localStorage.setItem('tabState', JSON.stringify(currentState));
}

// Function to get tab for a specific section
function getTabForSection(section) {
    const state = getTabState();
    return state[section] || getDefaultTabForSection(section);
}

// Get default tab for a section if none is saved
function getDefaultTabForSection(section) {
    const defaults = {
        main: 'home',
        activity: 'liked',
        profile: 'about'
    };
    return defaults[section];
}
