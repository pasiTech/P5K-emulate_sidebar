/**
 * Set up overrides for activities
 * 
 * Each entry must be the name of the activity with any of the following keys set
 * - string side        // Whether the sidebar is on the 'left' or 'right'
 * - int width          // The width of the sidebar
 * - int padding        // Padding to adjust for theme borders
 * - int xpos           // The x coordinate of a maximized window
 * - int ypos           // The y coordinate of a maximized window
 * - int maxHeight      // The height of a maximized window
 * - int maxWidth       // The width of a maximized window
 */
var activityOverrides = {
    // Plasma 5 ships with an activity named Default. If you haven't changed/removed it, set it here
    Default: {},
    
    // Any settings here will be used if an exact match for the activity is not found
    Fallback: {padding: 12}
};


/**
 * Any window titles in here that match, will be ignored
 */
var ignoreWindowTitles = ['Plasma', 'Yakuake'];








/**
 * 
 * NO MORE USER ADJUSTABLE FIELDS
 * 
 * Don't change anything below here, unless you know what you are doing
 */



/**
 * Activity Object
 * 
 * Methods and properties related to the activity
 */
var activity = {
    /**
     * @var string name
     * Name of the current activity
     */
    name: 'Unknown',
    
    /**
     * Set the name of the activity
     * 
     * Sets this.name to the provided activity name
     * 
     * @param string name       Name to set 
     */
    setName: function (name) {
        this.name = name;
    },
    
    /**
     * Finds the name of the current activity
     * 
     * KWin only exposes the activity ID, which is difficult for most users. So to get the actual
     * name, qdbus is needed.
     * 
     * @param function callback     The function for qdbus to call with the activity name
     */
    findName: function (callback) {
        var service = 'org.kde.ActivityManager';
        var path = '/ActivityManager/Activities';
        var iface = 'org.kde.ActivityManager.Activities';
        var method = 'ActivityName';
        var arg = workspace.currentActivity;
        callDBus(service, path, iface, method, arg, callback);
    },
    
    /**
     * Retrieve the overrides for the current activity
     */
    overrides: function() {
        var overrides = {};
        var fallback = {
            side: null,
            width: null,
            padding: null,
            xpos: null,
            ypos: null,
            maxHeight: null,
            maxWidth: null
        };
        
        // If the current activity or the fallback activity has some overrides, use those
        if (activityOverrides.hasOwnProperty(this.name)) {
            overrides = activityOverrides[this.name];
        } else if (activityOverrides.hasOwnProperty('Fallback')) {
            overrides = activityOverrides['Fallback'];
        }
        
        // Make sure every override property is set, even if it is to null
        for (var property in fallback) {
            if (fallback.hasOwnProperty(property)) {
                overrides[property] = overrides[property] || fallback[property];
            }
        }
        
        // Return the override group
        return overrides;
    }
};


/**
 * Desktop Object
 */
var desktop = {
    maxXpos: 0,
    maxYpos: null,
    maxWidth: workspace.displayWidth,
    maxHeight: null,
    clientMax: function(client) {
        return {
            x: this.maxXpos,
            y: this.maxYpos || client.geometry.y,
            width: this.maxWidth,
            height: this.maxHeight || client.geometry.height
        }
    },
    setGeometry: function() {
        var overrides = activity.overrides();
        this.maxXpos = overrides.xpos || this.calcDefaultX();
        this.maxYpos = overrides.ypos;
        this.maxWidth = overrides.maxWidth || workspace.displayWidth - sidebar.width;
        this.maxHeight = overrides.maxHeight;
    },
    calcDefaultX: function() {
        if (sidebar.side == 'right') { return 0; }
        return sidebar.width;
    }
};



/**
 * Sidebar Object
 */
var sidebar = {
    side: 'Unknown',
    width: 0,
    bounds: { left: {}, right: {} },
    
    // Detects if the sidebar and the client overlap
    overlaps: function(client) {
        var min = this.bounds[this.side]['min'];
        var max = this.bounds[this.side]['max'];
        var geometry = client.geometry;
        geometry.left = geometry.x;
        geometry.right = geometry.x + geometry.width;
        if (geometry[this.side] > min && geometry[this.side] < max) { return this.side; }
        return false;
    },
    
    // Set the geometry of the sidebar
    // Should be called once before accessing any sidebar functions on any state change
    setGeometry: function() {
        var overrides = activity.overrides();
        var panel = this.calcPanelSidebar();
        this.side = overrides.side || panel.side;
        this.width = overrides.width || panel.width + overrides.padding;
        
        // Set the bounds for the panel for both sides
        /* I do it this way to eliminate some complex if/then structures when trying to determine
            if a window is within the bounds. By setting the bounds for both a left sidebar and a
            right sidebar allows me to just check if the appropriate window border is within the
            bounds for the sidebar position */
        this.bounds.left.min = -10000;
        this.bounds.left.max = this.width;
        this.bounds.right.min = workspace.displayWidth - this.width - overrides.padding;
        this.bounds.right.max = workspace.displayWidth + 10000;
    },
    calcPanelSidebar: function() {
        var panelWidth = 0;
        var panelSide = 'Unknown';

        // Loop through the windows, extracting panels that either on the left or right
        var clients = workspace.clientList();
        for (var i = 0; i < clients.length; i++) {
            if (! clients[i].dock) { continue; }
            var geometry = clients[i].geometry;
            
            // Ignore if the panel is over half the screen width
            if (geometry.width >= workspace.displayWidth * .5) {
                continue;
                
            // Panel starts on the left side
            } else if (geometry.x < 10) {
                panelSide = 'left';
                
            // Panel starts on the right side
            } else if (geometry.x > workspace.displayWidth * .8) {
                panelSide = 'right';
                
            // Middle panel, so ignore
            } else {
                continue;
            }

            panelWidth = Math.max(geometry.width, panelWidth)
        }
        
        return {
            side: panelSide,
            width: panelWidth
        }
    },
};

/**
 * Window Object
 */
var window = {
    overlapAdjust: function(client) {
        var overlaps = sidebar.overlaps(client);
        if (! overlaps) { return; }
        var geometry = client.geometry;
        var x = {
            left: sidebar.width,
            right: workspace.displayWidth - sidebar.width - geometry.width,
        };
        geometry.x = x[overlaps];
        client.geometry = geometry;
    }
};


//
// Initialize workspace
//
workspace.clientAdded.connect(function(client) {
    if (! client.normalWindow) { return; }
    if (ignoreWindowTitles.indexOf(client.caption) > -1) { return; }
    activity.findName(function(name) {
        activity.setName(name);
        sidebar.setGeometry();
        desktop.setGeometry();
        window.overlapAdjust(client);
        
        // Has the window been tiled or untiled?
        /* This is a tricky one. The TileModeChanged signal does not indicate whether
            it is being tiled or untiled. So I have to try to figure it out. Right now
            I check to see if the window is about half the display width. If it is, then
            it is being tiled. There are a number of problems with this approach.
                1: A window that was 50% originally, will provide a false positive
                2: Panels on the side will provide false negatives
            
            However, without another way to tell if an electric border has been
            activated, I don't know what else to do! */        
        client.quickTileModeChanged.connect(function() {
            var relativeSize = Math.abs((workspace.displayWidth *.5) - client.geometry.width);
            if (relativeSize > 1) { return; }

            // Set the width to half the effective desktop width
            var rect = client.geometry;
            rect.width = desktop.maxWidth * .5;
                
            // If the tiling was on the right side, scoot the window over
            /* Again, since there is nothing to expose which electric border was activated,
                I have no idea, so I just try to see if the window ended up really close 
                to the halfway mark. Same basic false positives as before. */
            var relativePosition = Math.abs((workspace.displayWidth * .5) - client.geometry.x);
            if (relativePosition < 2) {
                rect.x = rect.x + (client.geometry.width - rect.width);
            }
            client.geometry = rect;
            window.overlapAdjust(client);
        });
        
        
    });
});
    
workspace.clientMaximizeSet.connect(function(client, h, v) {
    if (!h || !v) { return; }
    if (ignoreWindowTitles.indexOf(client.caption) > -1) { return; }    
    activity.findName(function(name) {
        activity.setName(name);
        sidebar.setGeometry();
        desktop.setGeometry();
        client.geometry = desktop.clientMax(client);
    });
});

function objToString (obj) {
    var str = '';
    for (var p in obj) {
        if (obj.hasOwnProperty(p)) {
            str += p + '::' + obj[p] + '\n';
        }
    }
    return str;
}
