var ignoreWindowTitles = ['Plasma', 'Yakuake'];

var activityOverrides = {
    Default: {side: 'left', width: 172},
    Fallback: {}
};


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
    maxYpos: 0,
    maxWidth: workspace.displayWidth,
    maxHeight: workspace.displayHeight,
    maxRect: function() {
        return {
            x: this.maxXpos,
            y: this.maxYpos,
            width: this.maxWidth,
            height: this.maxHeight
        }
    },
    setGeometry: function() {
        var overrides = activity.overrides();
        this.maxXpos = overrides.xpos || this.calcDefaultX();
        this.maxYpos = overrides.ypos || 0;
        this.maxWidth = overrides.maxWidth || workspace.displayWidth - sidebar.width;
        this.maxHeight = overrides.maxHeight || workspace.displayHeight;
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
            if (geometry.x < 10) {
                panelSide = 'left';
            } else if (geometry.x > workspace.displayWidth * .8) {
                panelSide = 'right';
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
        window.overlapAdjust(client);
    });
});
    
workspace.clientMaximizeSet.connect(function(client, h, v) {
    if (!h || !v) { return; }
    if (ignoreWindowTitles.indexOf(client.caption) > -1) { return; }    
    activity.findName(function(name) {
        activity.setName(name);
        sidebar.setGeometry();
        desktop.setGeometry();
        client.geometry = desktop.maxRect();
    });
});
