// Navigation configuration converted from XML to JavaScript
// This format is React-compatible and can be easily imported

export const navigationConfig = {
    appName: "FarmWise",
    menuItems: [
        {
            id: "soil",
            label: "SOIL",
            route: "/dashboard/soil",
            icon: "🌍",
            description: "Soil Analysis"
        },
        {
            id: "crop",
            label: "CROP",
            route: "/dashboard/crop",
            icon: "🌿",
            description: "Crop Analysis"
        },
        {
            id: "planner",
            label: "PLANNER",
            route: "/dashboard/planner",
            icon: "📅",
            description: "Smart Planner"
        },
        {
            id: "advisor",
            label: "ADVISOR",
            route: "/dashboard/advisor",
            icon: "🤖",
            description: "Advisor Bot"
        },
        {
            id: "reminders",
            label: "REMINDERS",
            route: "/dashboard/reminders",
            icon: "🔔",
            description: "Smart Reminders"
        }
    ]
};

// Helper function to get navigation items
export const getNavigationItems = () => navigationConfig.menuItems;

// Helper function to get app name
export const getAppName = () => navigationConfig.appName;

// Helper function to find navigation item by ID
export const getNavigationItemById = (id) => {
    return navigationConfig.menuItems.find(item => item.id === id);
};

// Helper function to find navigation item by route
export const getNavigationItemByRoute = (route) => {
    return navigationConfig.menuItems.find(item => item.route === route);
};

export default navigationConfig;
