var clients = workspace.clientList();
var panelLeftCheck = 10;
var panelRightCheck = workspace.workspaceWidth * .25;
var panelWidth = 5;
var xPos = 5;
var maxWidth = workspace.workspaceWidth * .5;
var panelPadding = 2;

for (var i=0; i<clients.length; i++) {
    var geometry = clients[i].geometry;
    
    if (clients[i].specialWindow && clients[i].caption == 'Plasma') {
        panelWidth = Math.max(geometry.width, panelWidth);
        maxWidth = workspace.workspaceWidth - panelWidth - panelPadding;
        if (geometry.x < panelLeftCheck) {
            xPos = panelWidth + panelPadding;
        } else if (geometry.x > panelRightCheck) {
            xPos = 0;
        }
    }
}

workspace.clientMaximizeSet.connect(function(client, h, v) {
    if (h && v) {
        var rect = client.geometry;
        rect.x = xPos;
        rect.y = 0;
        rect.width = maxWidth;
        rect.height = workspace.workspaceHeight;
        client.geometry = rect;
    }
});

