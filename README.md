# P5K-emulate_sidebar
Helps emulate a sidebar panel in Plasma 5

## Description
In Plasma 4.x, plasmoids could line up over partial panels as long as they had 'windows go below/windows can cover' checked. This allowed for powerful usage of Activities as you could have separate plasmoids for each activity that were not covered by windows all the time.

With the advent of Plasma 5, this no longer happens. I don't know why, but you can't do this anymore. So now this will allow you to emulate this functionality. When opening windows or maximizing them, they will respect a sidebar

## Installation
1. Download the emulate-sidebar.kwinscript file
2. plasmapkg2 -t kwinscript -i /path/to/emulate-sidebar.kwinscript
3. In KDE System Settings -> Workspace -> Window Management -> KWin Scripts, make sure Emulate Sidebar is active

## Basic Usage
1. Create a panel along the top or bottom edge
2. Resize the panel to your desired sidebar width
3. Make sure it is aligned either to the left or right
4. Windows will now respect this sidebar when adding or maximizing them

IMPORTANT!!! If you have a full width panel along the top or bottom, you CANNOT take advantage of automatic detection features at this time. You MUST use the advanced overrides

## Advanced Overrides
You can force the system to ignore panels. This allows you to even create different sidebar sizes for each activity. You can have sidebars on the left in one activity, and on the right in another activity!
1. Open the script file (~/.local/share/kwin/scripts/EmulateSidebar/contents/code/)
2. At the top of the file, in 'activityOverrides' you can make changes
3. Set any settings you want for the Fallback
4. Add any other settings for each Activity if you want

# TO DO
* Allow full width panels along the top or bottom  // Completed 12/02/17
* Respect sidebar when edge tiling, etc            // Completed 12/02/17
Allow virtual sidebars along the top or bottom
