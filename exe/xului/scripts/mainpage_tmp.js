// ===========================================================================
// eXe
// Copyright 2004-2005, University of Auckland
// Copyright 2004-2007 eXe Project, New Zealand Tertiary Education Commission
//
// This program is free software; you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation; either version 2 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program; if not, write to the Free Software
// Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
// ===========================================================================

// This file contains all the js related to the main xul page

// Strings to be translated
DELETE_  = 'Delete "';
NODE_AND_ALL_ITS_CHILDREN_ARE_YOU_SURE_ = '" node and all its children. Are you sure?';
RENAME_ = 'Rename "';
ENTER_THE_NEW_NAME = "Enter the new name";
SAVE_PACKAGE_FIRST_ = "Save Package first?";
THE_CURRENT_PACKAGE_HAS_BEEN_MODIFIED_AND_NOT_YET_SAVED_ = "The current package has been modified and not yet saved. ";
WOULD_YOU_LIKE_TO_SAVE_IT_BEFORE_LOADING_THE_NEW_PACKAGE_ = "Would you like to save it before loading the new package?";
DISCARD = 'Discard';
SELECT_A_FILE = "Select a File";
EXE_PACKAGE_FILES = "eXe Package Files";
APPARENTLY_USELESS_TITLE_WHICH_IS_OVERRIDDEN = "Apparently Useless Title which is Overridden";
IDEVICE_EDITOR = "iDevice Editor";
PREFERENCES = "Preferences";
METADATA_EDITOR = "metadata editor";
ABOUT = "About";
SELECT_THE_PARENT_FOLDER_FOR_EXPORT_ = "Select the parent folder for export.";
EXPORT_TEXT_PACKAGE_AS = "Export text package as";
TEXT_FILE = "Text File";
EXPORT_COMMONCARTRIDGE_AS = "Export Common Cartridge as";
EXPORT_SCORM_PACKAGE_AS = "Export SCORM package as";
EXPORT_IMS_PACKAGE_AS = "Export IMS package as";
EXPORT_WEBSITE_PACKAGE_AS = "Export Website package as";
EXPORT_IPOD_PACKAGE_AS = "Export iPod package as";
INVALID_VALUE_PASSED_TO_EXPORTPACKAGE = "INVALID VALUE PASSED TO exportPackage";
SELECT_PACKAGE_TO_INSERT = "Select package to insert";
SAVE_EXTRACTED_PACKAGE_AS = "Save extracted package as";


// This var is needed, because initWindow is called twice for some reason
var haveLoaded = false

// Set to false to stop selects doing page reloads
var clickon = true 

// Takes a server tree node id eg. '1' and returns a xul treeitem elemtent
// reference
function serverId2treeitem(serverId) {
    // Enumerate the tree elements until we find the correct one
    var tree = document.getElementById('outlineTree')
    var items = tree.getElementsByTagName('treeitem')
    for (var i=0; i<items.length; i++) {
        if (items[i].firstChild.getAttribute('_exe_nodeid') == serverId) {
            return items[i]
        }
    }
    return null // Should never really reach here
}

// Takes a server tree node id eg. '1' and returns a xul tree index
// Don t store this because this index changes when branches above the element
// are collapsed and expanded
function serverId2TreeId(serverId) {
    var tree = document.getElementById('outlineTree')
    var item = serverId2treeitem(serverId)
    if (item) {
        return tree.contentView.getIndexOfItem(item)
    } else {
        return '0' // Should never really reach here
    }
}

// Called when window shown/refreshed. Tells the server that now is a good time
// to put the correct selection in the node tree
function initWindow() {
    if (haveLoaded) {return}
    // Select the correct tree item
    nevow_clientToServerEvent('setTreeSelection', this, '');
    haveLoaded = true;
}

// Called by the server. Causes the correct selection to be put into the node
// tree.
function XHSelectTreeNode(serverId) {
    var index = serverId2TreeId(serverId)
    var tree = document.getElementById('outlineTree')
    var sel = tree.view.selection
    sel.currentIndex = index
    sel.timedSelect(index, 100)
    tree.focus()
}

// Returns the tree item from index which can come from 'tree.getCurrentIndex'
function getOutlineItem(tree, index) {
    // Get the appropriate treeitem element
    // There's a dumb thing with trees in that mytree.currentIndex
    // Shows the index of the treeitem that's selected, but if there is a
    // collapsed branch above that treeitem, all the items in that branch are
    // not included in the currentIndex value, so
    // "var treeitem = mytree.getElementsByTagName('treeitem')[mytree.currentIndex]"
    // doesn't work. We have to do this!
    var mytree = tree
    if (!mytree) { mytree = document.getElementById('outlineTree') }
    var items = mytree.getElementsByTagName('treeitem')
    for (var i=0; i<items.length; i++) {
        if (mytree.contentView.getIndexOfItem(items[i]) == index) {
            return items[i]
        }
    }
    return null // Should never get here
}


// Returns the currently selected tree item.
function currentOutlineItem(tree) {
    // Get the appropriate treeitem element
    var mytree = tree
    if (!mytree) { mytree = document.getElementById('outlineTree') }
    return getOutlineItem(tree, mytree.currentIndex)
}

// Returns the label of the currently selected tree row
function currentOutlineLabel() {
    var treeitem = currentOutlineItem()
    return treeitem.getElementsByTagName('treecell')[0].getAttribute('label')
}

// Returns the _exe_nodeid attribute of the currently selected row item
function currentOutlineId(index)
{
    disableButtons(true)
    var treeitem = currentOutlineItem()
    return treeitem.getElementsByTagName('treerow')[0].getAttribute('_exe_nodeid')
}

var outlineButtons = new Array('btnAdd', 'btnDel', 'btnRename', 'btnPromote', 'btnDemote', 'btnUp', 'btnDown')

function disableButtons(state) {
    for (button in outlineButtons) {
        document.getElementById(outlineButtons[button]).disabled = state
    }
}

function enableButtons() {
    disableButtons(false)
}

// Confirms the deletion of the currently selected node.
// Returns true or false for server
// Basically ignores request when requesting to delete home node 
function confirmDelete() {
    var id = currentOutlineId()
    if (id != '0') {
        return confirm(DELETE_  + currentOutlineLabel() + NODE_AND_ALL_ITS_CHILDREN_ARE_YOU_SURE_)
    } else {
        return 'false' 
    }
}

// Appends a child node with name and _exe_nodeid to the currently
// selected node
// XH means that the func is actually called by the server over xmlhttp
function XHAddChildTreeItem(nodeid, name) {
    var tree = document.getElementById('outlineTree');
    var treeitem = currentOutlineItem(tree)
    var row = treeitem.getElementsByTagName('treerow')[0]
    // Create the new node
    var newTreeRow = row.cloneNode(1) // Clone the existing row
    newTreeRow.firstChild.setAttribute('label', name) // Set the treecell s label
    newTreeRow.firstChild.setAttribute('name', name) // Set the treecell s label
    newTreeRow.setAttribute('_exe_nodeid', nodeid)
    var newTreeItem = document.createElement('treeitem')
    newTreeItem.appendChild(newTreeRow)
    insertChildTreeItem(treeitem, newTreeItem)
    // Select the new child
    tree.view.selection.select(tree.view.getIndexOfItem(newTreeItem))
}

function insertChildTreeItem(parentItem, newTreeItem, nextSibling) {
    // If we re not at the top level of the tree, become a container
    var container = parentItem.getAttribute('container')
    if ((!container) || (container == 'false')) {
        parentItem.setAttribute('container', 'true')
        parentItem.setAttribute('open', 'true')
        container = parentItem.appendChild(document.createElement('treechildren'))
    } else {
        container = parentItem.getElementsByTagName('treechildren')[0]
        // If still havent got a 'treechildren' node, then make one
        if (!container) {
            container = parentItem.appendChild(document.createElement('treechildren'))
        }
    }
    // Append/insert the new node
    if (nextSibling) {
        container.insertBefore(newTreeItem, nextSibling)
    } else { 
        container.appendChild(newTreeItem)
    }
}

// Delete is the currently selected node
// XH means that the func is actually called by the server over xmlhttp
// item can be a dom node or a server node id
function XHDelNode(item) {
    var tree = document.getElementById('outlineTree');
    if (!item) { var treeitem = currentOutlineItem(tree) }
    else if (typeof(item) == 'string') { var treeitem = serverId2treeitem(item) }
    else { var treeitem = item }
    var parentItem = treeitem.parentNode.parentNode
    // Select the parent node
    if (parentItem.tagName == 'treeitem') { 
        tree.view.selection.select(tree.view.getIndexOfItem(parentItem))
    }
    // Remove our node
    var parent = treeitem.parentNode
    parent.removeChild(treeitem)
    // If we dont have any siblings, make our parent be not a container
    if (parent.childNodes.length == 0) {
        parentItem.setAttribute('container', 'false')
        parentItem.removeChild(parent) // Remove the treechildren node
    }
}

// Renames the node associated with 'treeitem'
// titleShort is the short version of the title for the outlineTreeNode
// titleLong is the long version of the title for authoringPage
// titleFull is stored in the treecell's ID
// If 'treeitem' is not passed, uses currently selected node
function XHRenNode(titleShort, titleLong, titleFull, id) { 
    if (!id) {
        var treeitem = currentOutlineItem()
    } else {
        var treeitem = serverId2treeitem(id)
    }
    treeitem.getElementsByTagName('treecell')[0].setAttribute('label', titleShort);
    treeitem.getElementsByTagName('treecell')[0].setAttribute('name', titleFull);
    // Update the authoring page iframe
    var titleElement = top.frames[0].document.getElementById('nodeTitle');
    // Sometimes when promoting/demoting nodes
    // the title element isn't there/renedered for some reason
    // Looping doesn't fix that, so we just tell firefox
    // to reload the page
    if (titleElement) {
        titleElement.firstChild.nodeValue = titleLong;
    } else {
        top.frames[0].src = top.frames[0].src;
    }
}

// Moves a node in the tree
function XHMoveNode(id, parentId, nextSiblingId) {
    clickon = false
    try {
        var node = serverId2treeitem(id)
        var oldParent = node.parentNode.parentNode
        var newParent = serverId2treeitem(parentId)
        if (nextSiblingId != 'null') {
            var nextSibling = serverId2treeitem(nextSiblingId)
        } else {
            var nextSibling = null
        }
        // Remove ourselves from our old parent
        XHDelNode(node)
        // Insert ourselves in our new parent
        if (nextSibling) {
            insertChildTreeItem(newParent, node, nextSibling)
        } else {
            insertChildTreeItem(newParent, node)
        }
    } finally {
        clickon = true
    }
    // Re-select the node we just moved
    var tree = document.getElementById('outlineTree')
    tree.view.selection.select(tree.view.getIndexOfItem(node))
}
    

// Asks the user for a new name for the currently selected node
function askNodeName() {
    var treeitem = currentOutlineItem()
    var oldLabel = treeitem.getElementsByTagName('treecell')[0].getAttribute('name')
    var name = prompt(RENAME_+oldLabel+'"\n'+ENTER_THE_NEW_NAME, oldLabel);
    return name
}

function delTreeItem() { submitLink('deleteNode', currentOutlineId(), 1) }

// This is called when a different tree node is selected
function outlineClick() {
    if (clickon) {
        submitLink('changeNode', currentOutlineId(), 0);
        document.title = "eXe : " + currentOutlineLabel();
    }
}

// Call this to ask the server if the package is dirty
// 'ifDirty' will be evaled if the package is dirty
function checkDirty(ifClean, ifDirty) {
    nevow_clientToServerEvent('isPackageDirty', this, '', ifClean, ifDirty)
}

// Call this to ask the server if the package is dirty
// This is higher level than checkDirty; if the package is dirty, the user will 
// be asked if they want to save their changes
// 'nextStep' is a string that will be evaled if the package is clean, or if the user wants to
// discard the changes, or after the package has been saved, if the user chooses cancel
// nextStep will not be called
function askDirty(nextStep) {
    checkDirty(nextStep, 'askSave("'+nextStep+'")')
}

// This is called by the server to ask the user if they want to save their
// package before changing filenew/fileopen
// 'onProceed' is a string that is evaluated after the package has been saved or
// the user has chosen not to save the package, but not if user cancels
function askSave(onProceed) {
    netscape.security.PrivilegeManager.enablePrivilege("UniversalXPConnect")
    var promptClass = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
    var promptService = promptClass.getService(Components.interfaces.nsIPromptService)
    var flags = promptService.BUTTON_TITLE_SAVE * promptService.BUTTON_POS_0 +
                promptService.BUTTON_TITLE_IS_STRING * promptService.BUTTON_POS_1 +
                promptService.BUTTON_TITLE_CANCEL * promptService.BUTTON_POS_2
    var res = promptService.confirmEx(window,SAVE_PACKAGE_FIRST_,
                                      THE_CURRENT_PACKAGE_HAS_BEEN_MODIFIED_AND_NOT_YET_SAVED_ +
                                      WOULD_YOU_LIKE_TO_SAVE_IT_BEFORE_LOADING_THE_NEW_PACKAGE_,
                                      flags, null, DISCARD, null, '', {});
    if (res == 0) {
      // If we need to save the file
      // go through the whole save process
      fileSave(onProceed)
    } else if (res == 1) {
      // If Not to be saved, contiue the process
      eval(onProceed)
    } else if (res == 2) {
      // If cancel loading, cancel the whole process
      return
    }
}

// This is called when a user wants to create a new package
function fileNew() {
    // Ask the server if the current package is dirty
    askDirty("window.top.location = '/'")
}

// This is called when a user wants to open a new file
// It starts a chain of fileOpenX() funcs...
function fileOpen() {
    // Ask the server if the current package needs changing
    // And once we have the answer, go to fileOpen2()
    // The ansert is stored by the server in the global variable
    // isPackageDirty
    askDirty('fileOpen2()')
}

// Shows the the load dialog and actually loads the new package
function fileOpen2() {
    netscape.security.PrivilegeManager.enablePrivilege("UniversalXPConnect")
    var nsIFilePicker = Components.interfaces.nsIFilePicker;
    var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
    fp.init(window, SELECT_A_FILE, nsIFilePicker.modeOpen);
    fp.appendFilter(EXE_PACKAGE_FILES,"*.elp");
    fp.appendFilters(nsIFilePicker.filterAll);
    var res = fp.show();
    if (res == nsIFilePicker.returnOK) {
        nevow_clientToServerEvent('loadPackage', this, '', fp.file.path)
    }
}

// Opens the tutorial document
function fileOpenTutorial() {
    askDirty("fileOpenTutorial2();")
}

// Actually does the opening of the tutorial document, 
// once the current package has  been saved or discarded
function fileOpenTutorial2() {
    nevow_clientToServerEvent('loadTutorial', this, '')
}


// Opens a recent document
function fileOpenRecent(number) {
    askDirty("fileOpenRecent2('" + number + "');")
}

// Actually does the openning of the recent file, once the current package has 
// been saved or discarded
function fileOpenRecent2(number) {
    nevow_clientToServerEvent('loadRecent', this, '', number)
}

// Clear recent files menu
function fileRecentClear() {
    nevow_clientToServerEvent('clearRecent', this, '')
}

// Called by the user when they want to save their package
// Also called by some java script to cause a whole
// proper save process.
// 'onProceed' is optional, if passed it will be evaluated
// once the whole package has been saved or the save process
// has been cancelled by the user.
function fileSave(onProceed) {
    if (!onProceed)
        var onProceed = '';
    nevow_clientToServerEvent('getPackageFileName', this, '', 'fileSave2', onProceed);
}

// Takes the server's response after we asked it for the
// filename of the package we are currently editing
function fileSave2(filename, onDone) {
    if (filename) {
        saveWorkInProgress();
        // If the package has been previously saved/loaded
        // Just save it over the old file
        if (onDone) {
            nevow_clientToServerEvent('savePackage', this, '', '', onDone);
        } else {
            nevow_clientToServerEvent('savePackage', this, '');
        }
    } else {
        // If the package is new (never saved/loaded) show a
        // fileSaveAs dialog
        fileSaveAs(onDone)
    }
}

// Called by the user when they want to save their package
function fileSaveAs(onDone) {
    netscape.security.PrivilegeManager.enablePrivilege("UniversalXPConnect")
    var nsIFilePicker = Components.interfaces.nsIFilePicker;
    var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
    fp.init(window, SELECT_A_FILE, nsIFilePicker.modeSave);
    fp.appendFilter(EXE_PACKAGE_FILES,"*.elp");
    var res = fp.show();
    if (res == nsIFilePicker.returnOK || res == nsIFilePicker.returnReplace) {
        saveWorkInProgress();
        if (onDone) {
            nevow_clientToServerEvent('savePackage', this, '', fp.file.path, onDone)
        } else {
            nevow_clientToServerEvent('savePackage', this, '', fp.file.path)
        }
    } else {
        eval(onDone)
    }
}


// the first in a multi-function sequence for printing:
function filePrint() {
   // filePrint step#1: create a temporary print directory, 
   // and return that to filePrint2, which will then call exportPackage():
   netscape.security.PrivilegeManager.enablePrivilege("UniversalXPConnect")
   var tmpdir_suffix = ""
   var tmpdir_prefix = "eXeTempPrintDir_"
   nevow_clientToServerEvent('makeTempPrintDir', this, '', tmpdir_suffix, 
                              tmpdir_prefix, 'filePrint2')
   // note: as discussed below, at the end of filePrint3_openPrintWin(), 
   // the above makeTempPrintDir also removes any previous print jobs
}

function filePrint2(tempPrintDir, printDir_warnings) {
   if (printDir_warnings.length > 0) {
      alert(printDir_warnings)
   }
   exportPackage('printSinglePage', tempPrintDir, "filePrint3_openPrintWin");
}

function filePrint3_openPrintWin(tempPrintDir, tempExportedDir, webPrintDir) {
    // okay, at this point, exportPackage() has already been called and the 
    // exported file created, complete with its printing Javascript
    // into the tempPrintDir was created (and everything below it, and 
    // including it, will need to be removed), the actual files for printing 
    // were exported into tempExportedDir/index.html, where tempExportedDir 
    // is typically a subdirectory of tempDir, named as the package name.

   netscape.security.PrivilegeManager.enablePrivilege("UniversalXPConnect")

    // Still needs to be (a) opened, printed, and closed:
    var features = "width=680,height=440,status=1,resizable=1,left=260,top=200";
    print_url = webPrintDir+"/index.html"

    printWin = window.open (print_url, 
                  APPARENTLY_USELESS_TITLE_WHICH_IS_OVERRIDDEN, features);


    // and that's all she wrote!

    // note that due to difficulty with timing issues, the files are not 
    // (yet!) immediately removed upon completion of the print job 
    // the hope is for this to be resolved someday, somehow, 
    // but for now the nevow_clientToServerEvent('makeTempPrintDir',...) 
    // call in filePrint() also clears out any previous print jobs,
    // and this is called upon Quit of eXe as well, leaving *at most* 
    // one temporary print job sitting around.
} // function filePrint3_openPrintWin()



// Quit the application
function fileQuit() {
    // Call file - save as
    saveWorkInProgress()
    askDirty('doQuit()')
}

// Closes the window and stops the server
function doQuit() {
    netscape.security.PrivilegeManager.enablePrivilege("UniversalXPConnect")
    nevow_clientToServerEvent('quit', this, '');
    var start = new Date().getTime();
    while (new Date().getTime() < start + 500);
    klass = Components.classes["@mozilla.org/toolkit/app-startup;1"]
    interfac = Components.interfaces.nsIAppStartup
    instance = klass.getService(interfac)
    instance.quit(3)
}

// Submit any open iDevices
function saveWorkInProgress() {
    // Do a submit so any editing is saved to the server
    var theForm = top["authoringIFrame1"].document.getElementById('contentForm');
    if (!theForm) {
        // try and find the form for the authoring page
        theForm = document.getElementById('contentForm');
    }
    if (theForm)
        theForm.submit();
}

// Launch the iDevice Editor Window
function toolsEditor() {
    var features  = "width=800,height=700,status=no,resizeable=yes,"+
                    "scrollbars=yes";
    var editorWin = window.open("/editor", IDEVICE_EDITOR, features);
}

// Launch the Preferences Window
function toolsPreferences() {
    var features  = "width=500,height=200,status=no,resizeable=yes,"+
                    "scrollbars=yes";
    var editorWin = window.open("/preferences", PREFERENCES, features);
}

// launch brents crazy robot metadata editor and tag warehouse 
// loads the metadata editor
// of course i don't really know what to do after here ...
// but you get the idea right ;-) i just make em look purty!

function metadataEditor() {
    var features = "width=500,height=640,status=yes,resizeable=yes,scrollbars=yes";
    var metadataWin = window.open ("/templates/metadata.xul", METADATA_EDITOR, features);
}

// load the About page
function aboutPage() {
    var features = "width=299,height=515,status=0,resizable=0,left=260,top=150";
    aboutWin = window.open ("/about", ABOUT, features);
}



// browse the specified URL in system browser
function browseURL(url) {
    nevow_clientToServerEvent('browseURL', this, '', url);
}

// Appends an iDevice
// XH means that the func is actually called by the server over xmlhttp
function XHAddIdeviceListItem(ideviceId, ideviceTitle) {
    var list = document.getElementById('ideviceList');
    // Create the new listitem
    var newListItem = document.createElement('listitem')
    newListItem.setAttribute("onclick", 
                             "submitLink('AddIdevice', "+ideviceId+", 1);")
    newListItem.setAttribute("label", unescape(ideviceTitle))
    list.appendChild(newListItem)
}


// This function takes care of all
// exports. At the moment, this means web page export
// and scorm packages, with and without meta data
// 'exportType' is passed straight to the server
// Currently valid values are:
// 'scoem' 'ims' 'webSite'
function exportPackage(exportType, exportDir, printCallback) {
    netscape.security.PrivilegeManager.enablePrivilege("UniversalXPConnect");

    var nsIFilePicker = Components.interfaces.nsIFilePicker;
    var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
    if (exportType == 'webSite' || exportType == 'singlePage' || exportType == 'printSinglePage' || exportType == 'ipod' ) {
        if (exportDir == '') {
            fp.init(window, SELECT_THE_PARENT_FOLDER_FOR_EXPORT_,
                         nsIFilePicker.modeGetFolder);
            var res = fp.show();
            if (res == nsIFilePicker.returnOK || res == nsIFilePicker.returnReplace) {
                nevow_clientToServerEvent('exportPackage', this, '', exportType, fp.file.path, '')
            }
        }
        else {
            // use the supplied exportDir, rather than asking.
            // NOTE: currently only the printing mechanism will provide an exportDir, hence the printCallback function.
            nevow_clientToServerEvent('exportPackage', this, '', exportType, exportDir, printCallback)
        }
    } else if(exportType == "textFile"){
        title = EXPORT_TEXT_PACKAGE_AS;
        fp.init(window, title, nsIFilePicker.modeSave);
        fp.appendFilter(TEXT_FILE, "*.txt");
        fp.appendFilters(nsIFilePicker.filterAll);
        var res = fp.show();
        if (res == nsIFilePicker.returnOK || res == nsIFilePicker.returnReplace)
            nevow_clientToServerEvent('exportPackage', this, '', exportType, fp.file.path)
    } else {
        if (exportType == "scorm")
            title = EXPORT_SCORM_PACKAGE_AS;
        else if (exportType == "ims")
            title = EXPORT_IMS_PACKAGE_AS;
        else if (exportType == "zipFile")
            title = EXPORT_WEBSITE_PACKAGE_AS;
	else if (exportType == "commoncartridge")
	    title = EXPORT_COMMONCARTRIDGE_AS;
        else
            title = INVALID_VALUE_PASSED_TO_EXPORTPACKAGE;
        fp.init(window, title, nsIFilePicker.modeSave);
        fp.appendFilter("SCORM/IMS/ZipFile", "*.zip");
        fp.appendFilters(nsIFilePicker.filterAll);
        var res = fp.show();
        if (res == nsIFilePicker.returnOK || res == nsIFilePicker.returnReplace) {
            nevow_clientToServerEvent('exportPackage', this, '', exportType, fp.file.path)
        }
    }
} // exportPackage()


// This function takes care of mergeing packages
function insertPackage() {
    netscape.security.PrivilegeManager.enablePrivilege("UniversalXPConnect");
    var nsIFilePicker = Components.interfaces.nsIFilePicker;
    var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
    fp.init(window, SELECT_PACKAGE_TO_INSERT, nsIFilePicker.modeOpen);
    fp.appendFilter(EXE_PACKAGE_FILES,"*.elp");
    fp.appendFilters(nsIFilePicker.filterAll);
    var res = fp.show();
    if (res == nsIFilePicker.returnOK) {
        nevow_clientToServerEvent('insertPackage', this, '', fp.file.path)
    }
}

// This function takes care of mergeing packages
function extractPackage() {
    netscape.security.PrivilegeManager.enablePrivilege("UniversalXPConnect");
    var nsIFilePicker = Components.interfaces.nsIFilePicker;
    var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
    fp.init(window, SAVE_EXTRACTED_PACKAGE_AS, nsIFilePicker.modeSave);
    fp.appendFilter(EXE_PACKAGE_FILES,"*.elp");
    fp.appendFilters(nsIFilePicker.filterAll);
    var res = fp.show();
    if (res == nsIFilePicker.returnOK || res == nsIFilePicker.returnReplace) {
        nevow_clientToServerEvent('extractPackage', this, '', fp.file.path, res == nsIFilePicker.returnReplace)
    }
}

//=================================================
//Anfang Ergaenzung

function openManual(){
	var features = "width=1000,height=700,resizable=0,left=0,top=0,status=yes,resizeable=yes,scrollbars=yes", myWin;
    myWin = window.open ("http://www.exelearningplus.de/?eXelearningPlus:Handbuch", "Handbuch", features);
}

function openTips(){
	var features = "width=1000,height=700,resizable=0,left=0,top=0,status=yes,resizeable=yes,scrollbars=yes", myWin;
    myWin = window.open ("http://www.exelearningplus.de/?eXelearningPlus:Tipps", "Tipps", features);
}

function openReport(){
	var features = "width=1000,height=700,resizable=0,left=0,top=0,status=yes,resizeable=yes,scrollbars=yes", myWin;
    myWin = window.open ("http://www.exelearningplus.de/?eXelearningPlus:Bericht", "Bericht", features);
}


function versionPage(){
	var xoptions="width=700,height=745,status=0,resizable=1,left=200,top=0,scrollbars=1";
	var xname = "versioninfo";
	var subtree = "";
subtree +='<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">\n';
subtree +='<html>\n';
subtree +='<head>\n';
subtree +='</head>\n';
subtree +='\n';
subtree +='<body>\n';
subtree +='<pre>\n';
subtree +='Version 1.04 Plus\n'
subtree +='* Added SCORM dropdown, SCORM cloze and SCORM multiple choice Tests\n';
subtree +='* Tested with Ilias and Moodle\n';
subtree +='* Supports Geogebra 3.2\n';
subtree +='* Cloze activity may contain whitespaces\n';
subtree +='===========================================================================\n';
subtree +='Copyright 2008, lernmodule.net gGmbH\n';
subtree +='Durlacher Str. 22, 76356 Weingarten, Germany\n';
subtree +='\n';
subtree +='The eXelearningPlus Extensions are Open Source; you can redistribute the\n';
subtree +='software under the terms of the GNU General Public License, Version 2, as\n';
subtree +='published by the Free Software Foundation. The software is free to use,\n';
subtree +='but only if a link to exelearningplus.de is kept visible on the pages using\n';
subtree +='the eXelearningPlus Extensions. If you want to remove or hide this feature\n';
subtree +='from your pages, you have to get a permission by lernmodule.net.\n';
subtree +='Please contact.\n';
subtree +='\n';
subtree +='This program is distributed in the hope that it will be useful,\n';
subtree +='but WITHOUT ANY WARRANTY; without even the implied warranty of\n';
subtree +='MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the\n';
subtree +='GNU General Public License for more details.\n';
subtree +='\n';
subtree +='You should have received a copy of the GNU General Public License\n';
subtree +='along with this program; if not, write to the Free Software\n';
subtree +='Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA\n';
subtree +='===========================================================================\n';
subtree +='\n';
subtree +='Version 1.02 (r3303) 2007-10-01\n';
subtree +='* Add ability to type resource name into url box (without browse button)\n';
subtree +='* Add CSS divs around nodes in single page and print exports for pagination\n';
subtree +='* Add detailed uninstall name, links, icon for Windows\n';
subtree +='* Make reading very old eXe packages more robust if corruption encountered\n';
subtree +='* Fix XHTML for div wrapper of Java Applet iDevice export\n';
subtree +='* Add ID, TH translations\n';
subtree +='\n';
subtree +='Version 1.01 (r3265) 2007-09-05\n';
subtree +='* Add embedded MP3 player as a rich text editor media type\n';
subtree +='* Add FLV player as rich text editor media type\n';
subtree +='* Add DIV around each iDevice on web/ims/scorm export\n';
subtree +='* Add disabling SUBMIT ANSWERS button in SCORM Quiz after first submission\n';
subtree +='* Fix web folder export to convert filenames to safe ASCII characters\n';
subtree +='* Fix iPod Notes export to write UTF-8 index (non-ASCII node names)\n';
subtree +='* Fix XHTML generated for SCORM Quiz\n';
subtree +='* Fix XHTML generated for True-False question feedback\n';
subtree +='* Fix reading of exe.conf files that have UTF-8 "byte order mark"\n';
subtree +='* Fix insertion of non-ASCII package names in Recent Projects list\n';
subtree +='* Change license footer text so translators can ignore trailing space\n';
subtree +='* Change RPM spec file to work better with openSUSE\n';
subtree +='* Remove deprecated dublincore.xml metadata file from SCORM 1.2 packages\n';
subtree +='* Updated DE,FR,IT,PL translations\n';
subtree +='\n';
subtree +='Version 1.00 (r3219) 2007-08-17\n';
subtree +='* Fix styles to use relative line height rather than absolute\n';
subtree +='* Fix splash progress bar to indicate 100%\n';
subtree +='* Fix iDevice deletion issues including read-only resources\n';
subtree +='* Fix display of embedded image borders\n';
subtree +='* Fix header text display in single page export and printing\n';
subtree +='* Make merging packages more robust\n';
subtree +='* Make default IMS/SCORM Metadata title description from package values\n';
subtree +='* Change export to folder to not change UTF-8 filenames\n';
subtree +='* Update About box\n';
subtree +='\n';
subtree +='For older versions and support see <a href="http://exelearning.org/Release_Notes">http://exelearning.org/Release_Notes</a>\n'
subtree +='=========================================\n';
subtree +='    eXe: The eLearning XHML editor\n';
subtree +='=========================================\n';
subtree +='$Revision$\n';
subtree +='$Date$\n';
subtree +='\n';
subtree +='===========================================================================\n';
subtree +='Copyright 2004-2005, University of Auckland\n';
subtree +='Copyright 2004-2008 eXe Project, http://exelearning.org/\n';
subtree +='All rights reserved, see COPYING for details.\n';
subtree +='\n';
subtree +='This program is free software; you can redistribute it and/or modify\n';
subtree +='it under the terms of the GNU General Public License as published by\n';
subtree +='the Free Software Foundation; either version 2 of the License, or\n';
subtree +='(at your option) any later version.\n';
subtree +='\n';
subtree +='This program is distributed in the hope that it will be useful,\n';
subtree +='but WITHOUT ANY WARRANTY; without even the implied warranty of\n';
subtree +='MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the\n';
subtree +='GNU General Public License for more details.\n';
subtree +='\n';
subtree +='You should have received a copy of the GNU General Public License\n';
subtree +='along with this program; if not, write to the Free Software\n';
subtree +='Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA\n';
subtree +='===========================================================================\n';
subtree +='BUILDING FROM SOURCE\n';
subtree +='====================\n';
subtree +='\n';
subtree +='Please see http://eXeLearning.org/BuildingFromSource for information\n';
subtree +='on obtaining and building eXe and its dependencies.\n';
subtree +='\n';
subtree +='\n';
subtree +='CREDITS\n';
subtree +='=======\n';
subtree +='\n';
subtree +=' * Secret Labs AB and Fredrik Lundh for The Python Imaging Library (PIL) \n';
subtree +='\n';
subtree +='The Python Imaging Library (PIL) is\n';
subtree +='\n';
subtree +='    Copyright 1997-2005 by Secret Labs AB\n';
subtree +='    Copyright 1995-2005 by Fredrik Lundh\n';
subtree +='\n';
subtree +='By obtaining, using, and/or copying this software and/or its associated\n';
subtree +='documentation, you agree that you have read, understood, and will comply\n';
subtree +='with the following terms and conditions:\n';
subtree +='\n';
subtree +='Permission to use, copy, modify, and distribute this software and its\n';
subtree +='associated documentation for any purpose and without fee is hereby\n';
subtree +='granted, provided that the above copyright notice appears in all copies,\n';
subtree +='and that both that copyright notice and this permission notice appear in\n';
subtree +='supporting documentation, and that the name of Secret Labs AB or the\n';
subtree +='author not be used in advertising or publicity pertaining to\n';
subtree +='distribution of the software without specific, written prior permission.\n';
subtree +='\n';
subtree +='SECRET LABS AB AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO\n';
subtree +='THIS SOFTWARE, INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND\n';
subtree +='FITNESS. IN NO EVENT SHALL SECRET LABS AB OR THE AUTHOR BE LIABLE FOR\n';
subtree +='ANY SPECIAL, INDIRECT OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER\n';
subtree +='RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF\n';
subtree +='CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN\n';
subtree +='CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.\n';
subtree +='\n';
subtree +='\n';
subtree +=' * CTC for APIWrapper.js and SCOFunctions.js\n';
subtree +='\n';
subtree +='Concurrent Technologies Corporation (CTC) grants you ("Licensee") a non-\n';
subtree +='exclusive, royalty free, license to use, modify and redistribute this\n';
subtree +='software in source and binary code form, provided that i) this copyright\n';
subtree +='notice and license appear on all copies of the software; and ii) Licensee does\n';
subtree +='not utilize the software in a manner which is disparaging to CTC.\n';
subtree +='\n';
subtree +='This software is provided "AS IS," without a warranty of any kind.  ALL\n';
subtree +='EXPRESS OR IMPLIED CONDITIONS, REPRESENTATIONS AND WARRANTIES, INCLUDING ANY\n';
subtree +='IMPLIED WARRANTY OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE OR NON-\n';
subtree +='INFRINGEMENT, ARE HEREBY EXCLUDED.  CTC AND ITS LICENSORS SHALL NOT BE LIABLE\n';
subtree +='FOR ANY DAMAGES SUFFERED BY LICENSEE AS A RESULT OF USING, MODIFYING OR\n';
subtree +='DISTRIBUTING THE SOFTWARE OR ITS DERIVATIVES.  IN NO EVENT WILL CTC  OR ITS\n';
subtree +='LICENSORS BE LIABLE FOR ANY LOST REVENUE, PROFIT OR DATA, OR FOR DIRECT,\n';
subtree +='INDIRECT, SPECIAL, CONSEQUENTIAL, INCIDENTAL OR PUNITIVE DAMAGES, HOWEVER\n';
subtree +='CAUSED AND REGARDLESS OF THE THEORY OF LIABILITY, ARISING OUT OF THE USE OF\n';
subtree +='OR INABILITY TO USE SOFTWARE, EVEN IF CTC  HAS BEEN ADVISED OF THE POSSIBILITY\n';
subtree +='OF SUCH DAMAGES.\n';
subtree +='\n';
subtree +=' * Mozilla for XUL and the XPFE\n';
subtree +='\n';
subtree +='Version: NPL 1.1/GPL 2.0/LGPL 2.1\n';
subtree +='\n';
subtree +='The contents of this file are subject to the Netscape Public License\n';
subtree +='Version 1.1 (the "License"); you may not use this file except in\n';
subtree +='compliance with the License. You may obtain a copy of the License at\n';
subtree +='http://www.mozilla.org/NPL/\n';
subtree +='\n';
subtree +='Software distributed under the License is distributed on an "AS IS" basis,\n';
subtree +='WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License\n';
subtree +='for the specific language governing rights and limitations under the\n';
subtree +='License.\n';
subtree +='\n';
subtree +='The Original Code is mozilla.org code.\n';
subtree +='\n';
subtree +='The Initial Developer of the Original Code is \n';
subtree +='Netscape Communications Corporation.\n';
subtree +='Portions created by the Initial Developer are Copyright (C) 1998\n';
subtree +='the Initial Developer. All Rights Reserved.\n';
subtree +='\n';
subtree +=' * Fabricio Zuardi for XSPF Web Music Player mp3 player\n';
subtree +='\n';
subtree +='Music Player is Open Source Software, licensed under the BSD and can be used \n';
subtree +='and modified by anyone, including for commercial purposes.\n';
subtree +='\n';
subtree +='XSPF Web Music Player is a flash-based web application that uses xspf playlist\n';
subtree +='format to play mp3 songs. XSPF is the XML Shareable Playlist Format. The \n';
subtree +='software is written in Actionscript 2.\n';
subtree +='\n';
subtree +='For more information on XSPF, see: http://musicplayer.sourceforge.net/\n';
subtree +='\n';
subtree +=' * Anssi Piirainen for FlowPlayer FLV video player\n';
subtree +='\n';
subtree +='FlowPlayer is a free Flash video player. \n';
subtree +='License: Apache License V2.0 \n';
subtree +='\n';
subtree +='For more information on FlowPlayer, see: http://flowplayer.org/\n';
subtree +='\n';
subtree +=' * John Forkosh Associates, Inc. for mimeTeX \n';
subtree +='\n';
subtree +='mimeTeX is distributed under the terms of the GNU General Public License.\n';
subtree +='http://www.gnu.org/licenses/gpl.html\n';
subtree +='\n';
subtree +='The complete source code is available from http://www.forkosh.com/mimetex.zip\n';
subtree +='\n';
subtree +='Contributor(s):\n';
subtree +='\n';
subtree +='Alternatively, the contents of this file may be used under the terms of\n';
subtree +='either the GNU General Public License Version 2 or later (the "GPL"), or \n';
subtree +='the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),\n';
subtree +='in which case the provisions of the GPL or the LGPL are applicable instead\n';
subtree +='of those above. If you wish to allow use of your version of this file only\n';
subtree +='under the terms of either the GPL or the LGPL, and not to allow others to\n';
subtree +='use your version of this file under the terms of the NPL, indicate your\n';
subtree +='decision by deleting the provisions above and replace them with the notice\n';
subtree +='and other provisions required by the GPL or the LGPL. If you do not delete\n';
subtree +='the provisions above, a recipient may use your version of this file under\n';
subtree +='the terms of any one of the NPL, the GPL or the LGPL.\n';
subtree +='\n';
subtree +=' * Mark Pilgrim for Universal Feed Parser\n';
subtree +='\n';
subtree +='Copyright (c) 2002-2006, Mark Pilgrim, All rights reserved.\n';
subtree +='\n';
subtree +='Redistribution and use in source and binary forms, with or without modification,\n';
subtree +='are permitted provided that the following conditions are met:\n';
subtree +='\n';
subtree +='* Redistributions of source code must retain the above copyright notice,\n';
subtree +='  this list of conditions and the following disclaimer.\n';
subtree +='* Redistributions in binary form must reproduce the above copyright notice,\n';
subtree +='  this list of conditions and the following disclaimer in the documentation\n';
subtree +='  and/or other materials provided with the distribution.\n';
subtree +='\n';
subtree +="THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS 'AS IS'\n";
subtree +='AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE\n';
subtree +='IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE\n';
subtree +='ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE\n';
subtree +='LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR\n';
subtree +='CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF\n';
subtree +='SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS\n';
subtree +='INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN\n';
subtree +='CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)\n';
subtree +='ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE\n';
subtree +='POSSIBILITY OF SUCH DAMAGE.\n';
subtree +='\n';
subtree +=' * Beautiful Soup is Copyright (c) 2004-2007, Leonard Richardson\n';
subtree +='\n';
subtree +='All rights reserved.\n';
subtree +='\n';
subtree +='Redistribution and use in source and binary forms, with or without\n';
subtree +='modification, are permitted provided that the following conditions are\n';
subtree +='met:\n';
subtree +='\n';
subtree +='  * Redistributions of source code must retain the above copyright\n';
subtree +='    notice, this list of conditions and the following disclaimer.\n';
subtree +='\n';
subtree +='  * Redistributions in binary form must reproduce the above\n';
subtree +='    copyright notice, this list of conditions and the following\n';
subtree +='    disclaimer in the documentation and/or other materials provided\n';
subtree +='    with the distribution.\n';
subtree +='\n';
subtree +='  * Neither the name of the the Beautiful Soup Consortium and All\n';
subtree +='    Night Kosher Bakery nor the names of its contributors may be\n';
subtree +='    used to endorse or promote products derived from this software\n';
subtree +='    without specific prior written permission.\n';
subtree +='\n';
subtree +='THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS\n';
subtree +='"AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT\n';
subtree +='LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR\n';
subtree +='A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR\n';
subtree +='CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,\n';
subtree +='EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,\n';
subtree +='PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR\n';
subtree +='PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF\n';
subtree +='LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING\n';
subtree +='NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS\n';
subtree +='SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE, DAMMIT.\n';
subtree +='\n';
subtree +=' * XSPF Web Music Player 0.2.3 is Copyright (c) 2005, Fabricio Zuardi\n';
subtree +='\n';
subtree +='Copyright (c) 2005, Fabricio Zuardi\n';
subtree +='All rights reserved.\n';
subtree +='\n';
subtree +='Redistribution and use in source and binary forms, with or without\n';
subtree +='modification, are permitted provided that the following conditions are\n';
subtree +='met:\n';
subtree +='\n';
subtree +='  * Redistributions of source code must retain the above copyright\n';
subtree +='    notice, this list of conditions and the following disclaimer.\n';
subtree +='  * Redistributions in binary form must reproduce the above copyright\n';
subtree +='    notice, this list of conditions and the following disclaimer in the\n';
subtree +='    documentation and/or other materials provided with the distribution.\n';
subtree +='  * Neither the name of the author nor the names of its contributors\n';
subtree +='    may be used to endorse or promote products derived from this software\n';
subtree +='    without specific prior written permission.\n';
subtree +='\n';
subtree +='THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS\n';
subtree +='IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED\n';
subtree +='TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A\n';
subtree +='PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER\n';
subtree +='OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,\n';
subtree +='EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,\n';
subtree +='PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR\n';
subtree +='PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF\n';
subtree +='LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING\n';
subtree +='NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS\n';
subtree +='SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.\n';
subtree +='\n';
subtree +=' * GeoGebra is Copyright 2001-2008 Geogebra Inc.\n';
subtree +='\n';
subtree +='GeoGebra is a free and multi-platform dynamic mathematics software for\n';
subtree +='schools that joins geometry, algebra, and calculus.  The application\n';
subtree +='used is licensed under the GNU General Public License.  (See the COPYING\n';
subtree +='file.)\n';
subtree +='\n';
subtree +='More information about GeoGebra and the source code are available from\n';
subtree +='http://www.geogebra.org/\n';
subtree +='\n';
subtree +=' * Twisted Python 2.2.0 is Copyright (c) 2001-2005\n';
subtree +='Allen Short\n';
subtree +='Andrew Bennetts\n';
subtree +='Apple Computer, Inc.\n';
subtree +='Benjamin Bruheim\n';
subtree +='Bob Ippolito\n';
subtree +='Canonical Limited\n';
subtree +='Christopher Armstrong\n';
subtree +='Donovan Preston\n';
subtree +='Eric Mangold\n';
subtree +='Itamar Shtull-Trauring\n';
subtree +='James Knight\n';
subtree +='Jason A. Mobarak\n';
subtree +='Jonathan Lange\n';
subtree +='Jonathan D. Simms\n';
subtree +='Jp Calderone\n';
subtree +='J######Hermann\n';
subtree +='Kevin Turner\n';
subtree +='Mary Gardiner\n';
subtree +='Matthew Lefkowitz\n';
subtree +='Massachusetts Institute of Technology\n';
subtree +='Moshe Zadka\n';
subtree +='Paul Swartz\n';
subtree +='Pavel Pergamenshchik\n';
subtree +='Sean Riley\n';
subtree +='Travis B. Hartwell\n';
subtree +='\n';
subtree +='Permission is hereby granted, free of charge, to any person obtaining\n';
subtree +='a copy of this software and associated documentation files (the\n';
subtree +='"Software"), to deal in the Software without restriction, including\n';
subtree +='without limitation the rights to use, copy, modify, merge, publish,\n';
subtree +='distribute, sublicense, and/or sell copies of the Software, and to\n';
subtree +='permit persons to whom the Software is furnished to do so, subject to\n';
subtree +='the following conditions:\n';
subtree +='\n';
subtree +='The above copyright notice and this permission notice shall be\n';
subtree +='included in all copies or substantial portions of the Software.\n';
subtree +='\n';
subtree +='THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,\n';
subtree +='EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF\n';
subtree +='MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND\n';
subtree +='NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE\n';
subtree +='LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION\n';
subtree +='OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION\n';
subtree +='WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.\n';
subtree +='\n';
subtree +=' * Nevow 0.4.1 is Copyright (c) 2004\n';
subtree +='Donovan Preston\n';
subtree +='Matt Goodall\n';
subtree +='James Y. Knight\n';
subtree +='Glyph Lefkowitz\n';
subtree +='JP Calderone\n';
subtree +='Allen Short\n';
subtree +='Alex Levy\n';
subtree +='Justin Johnson\n';
subtree +='Christopher Armstrong\n';
subtree +='Jonathan Simms\n';
subtree +='Phil Frost\n';
subtree +='Tommi Virtanen\n';
subtree +='Michal Pasternak\n';
subtree +='Valentino Volonghi\n';
subtree +='\n';
subtree +='\n';
subtree +='Permission is hereby granted, free of charge, to any person obtaining\n';
subtree +='a copy of this software and associated documentation files (the\n';
subtree +='"Software"), to deal in the Software without restriction, including\n';
subtree +='without limitation the rights to use, copy, modify, merge, publish,\n';
subtree +='distribute, sublicense, and/or sell copies of the Software, and to\n';
subtree +='permit persons to whom the Software is furnished to do so, subject to\n';
subtree +='the following conditions:\n';
subtree +='\n';
subtree +='The above copyright notice and this permission notice shall be\n';
subtree +='included in all copies or substantial portions of the Software.\n';
subtree +='\n';
subtree +='THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,\n';
subtree +='EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF\n';
subtree +='MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND\n';
subtree +='NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE\n';
subtree +='LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION\n';
subtree +='OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION\n';
subtree +='WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.\n';
subtree +='\n';
subtree +=' * Magnifier was developed for eXe by Bruce Webster\n';
subtree +='An archive containing the associated files can be download from\n';
subtree +='http://zebo.org/magnify/\n';
subtree +='\n';
subtree +=' * iPod is a trademark of Apple Inc.\n';
subtree +='\n';
subtree +=' * Wingware generously donated licenses for the Wing Python IDE to developers working on eXe.\n';
subtree +='\n';
subtree +='</pre>\n';
subtree +='</body>\n';
subtree +='</html>\n';
	newWindow(xname, subtree, xoptions);
}

function newWindow(name, content, options)
{
	var xwindow = window.open("", name, options);
	if (xwindow != null)
	{
		xwindow.document.open();
		xwindow.document.write(content);
		xwindow.document.close();
	}
	return xwindow;
}

//Ende Ergaenzung

